require('dotenv').config();

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const crypto = require('crypto');
const { put } = require('@vercel/blob');

const { isCvEmail } = require('./cv-detector');
const { sendCvConfirmation } = require('./email-sender');

const {
  isProcessed,
  markAsProcessed
} = require('./processed-store');


async function saveCvAttachment(
  attachments,
  messageId
) {
  const cvAttachment = attachments.find(
    (attachment) => {
      const filename = (
        attachment.filename || ''
      ).toLowerCase();

      return (
        filename.endsWith('.pdf') ||
        filename.endsWith('.doc') ||
        filename.endsWith('.docx')
      );
    }
  );

  if (!cvAttachment) {
    return null;
  }

  const originalName =
    cvAttachment.filename || 'cv.pdf';

  const extension = originalName
    .substring(originalName.lastIndexOf('.'))
    .toLowerCase();

  if (
    !['.pdf', '.doc', '.docx'].includes(extension)
  ) {
    return null;
  }

  const fileHash = crypto
    .createHash('sha256')
    .update(messageId)
    .digest('hex');

  const storedName =
    `${fileHash}${extension}`;

  console.log('☁️ Guardando CV en Vercel Blob...');

  const blob = await put(
    `cvs/${storedName}`,
    cvAttachment.content,
    {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      token:
        process.env.BLOB_READ_WRITE_TOKEN,
    }
  );

  return {
    originalName,
    storedName,
    pathname: blob.pathname,
  };
}


async function scanEmails() {
  const automationStartDate =
    process.env.AUTOMATION_START_DATE;

  if (!automationStartDate) {
    throw new Error(
      'Falta configurar AUTOMATION_START_DATE'
    );
  }

  const startDate =
    new Date(automationStartDate);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error(
      'AUTOMATION_START_DATE tiene un formato inválido'
    );
  }

  const client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(
      process.env.IMAP_PORT || 993
    ),
    secure: true,

    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },

    logger: false,
  });


  try {
    console.log('1️⃣ Conectando al correo...');

    await client.connect();

    console.log('✅ IMAP conectado');


    const lock =
      await client.getMailboxLock('INBOX');

    try {
      console.log(
        '2️⃣ Buscando correos nuevos...'
      );

      /*
       * IMAP filtra primero por:
       *
       * - correo NO leído
       * - recibido desde la fecha
       *   de activación
       *
       * Esto evita descargar todo
       * el historial.
       */
      const unseenMessages =
        await client.search({
          seen: false,
          since: startDate,
        });


      console.log(
        `📨 Correos candidatos: ${unseenMessages.length}`
      );

      if (unseenMessages.length === 0) {
      console.log(
         '✅ No hay correos nuevos para analizar.'
        );

         return;
     }

      // Vercel no debe procesar demasiados correos
      // dentro de una misma ejecución.
      const MAX_EMAILS_PER_RUN = 3;

       const messagesToProcess =
         unseenMessages
           .slice(-MAX_EMAILS_PER_RUN);

       console.log(
         `⚙️ Procesando ${messagesToProcess.length} de ${unseenMessages.length} correos candidatos`
       );

      console.log(
        '3️⃣ Comenzando procesamiento...'
      );


      for await (
    const message of client.fetch(
     messagesToProcess,
     {
      envelope: true,
      source: true,
      uid: true,
     }
      )
    ) {
        try {
          console.log(
            `🔎 Analizando UID ${message.uid}...`
          );


          const parsed =
            await simpleParser(
              message.source
            );


          /*
           * IMAP "since" trabaja principalmente
           * a nivel de fecha.
           *
           * Conservamos esta comparación para
           * respetar también la HORA exacta
           * configurada.
           */
          const emailDate =
            parsed.date;


          if (
            emailDate &&
            emailDate < startDate
          ) {
            console.log(
              `⏭️ Correo anterior a la activación: ${emailDate}`
            );

            continue;
          }


          const messageId =
            parsed.messageId ||
            `uid-${message.uid}`;


          const from =
            parsed.from?.value?.[0]?.name ||
            parsed.from?.value?.[0]?.address ||
            'Desconocido';


          const email =
            parsed.from?.value?.[0]?.address ||
            null;


          const subject =
            parsed.subject ||
            '(Sin asunto)';


          const text =
            parsed.text || '';


          const attachments =
            parsed.attachments || [];


          console.log(
            '🔍 Verificando duplicado...'
          );


          if (
            await isProcessed(messageId)
          ) {
            console.log(
              '⏭️ Este correo ya fue procesado anteriormente.'
            );

            continue;
          }


          const isCv =
            isCvEmail({
              subject,
              text,
              attachments,
            });


          console.log(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
          );

          console.log(`📩 De: ${from}`);

          console.log(
            `📧 Email: ${
              email || 'Sin email'
            }`
          );

          console.log(
            `📌 Asunto: ${subject}`
          );


          if (attachments.length > 0) {
            console.log(
              `📎 Adjuntos: ${
                attachments
                  .map(
                    (a) =>
                      a.filename ||
                      'archivo'
                  )
                  .join(', ')
              }`
            );
          } else {
            console.log(
              '📎 Adjuntos: ninguno'
            );
          }


          console.log(
            `🤖 ¿Parece una postulación?: ${
              isCv
                ? '✅ SÍ'
                : '❌ NO'
            }`
          );


          // No es CV
          if (!isCv) {
          console.log(
         '⏭️ No es una postulación. No se envía respuesta.'
          );

                await client.messageFlagsAdd(
           message.uid,
           ['\\Seen'],
           {
             uid: true
           }
         );

         console.log(
           '📬 Correo no-CV marcado como leído'
         );

          continue;
          }

          // No tenemos remitente
          if (!email) {
            console.log(
              '⚠️ No se encontró email del remitente.'
            );

            continue;
          }


          /*
           * Guardar CV en
           * Vercel Private Blob
           */
          const savedCv =
            await saveCvAttachment(
              attachments,
              messageId
            );


          if (savedCv) {
            console.log(
              `💾 CV guardado: ${savedCv.storedName}`
            );
          } else {
            console.log(
              '⚠️ Postulación sin PDF/DOC/DOCX.'
            );
          }


          /*
           * Enviar confirmación
           */
          console.log(
            `📤 Enviando confirmación a ${email}...`
          );


          await sendCvConfirmation({
            to: email,
          });


          console.log(
            '✅ Confirmación enviada'
          );


          /*
           * Guardar candidato
           * en Firestore
           */
          console.log(
            '🔥 Guardando candidato en Firestore...'
          );


          await markAsProcessed({
            messageId,

            name: from,

            email,

            subject,

            attachmentName:
              savedCv?.originalName || '',

            cvStoredName:
              savedCv?.storedName || '',

            cvStored:
              !!savedCv
          });


          console.log(
            '🔥 Registro guardado en Firestore'
          );


          /*
           * Solo después de completar
           * todo correctamente marcamos
           * el email como leído.
           */
         
        console.log(
          '✅ Correo procesado correctamente'
         );  

        } catch (error) {
          console.error(
            '❌ Error procesando el correo:',
            error.message
          );

          console.log(
            '⚠️ Se deja sin procesar para reintentarlo.'
          );
        }
      }

    } finally {
      lock.release();
    }

  } catch (error) {
    console.error(
      '❌ Error general:',
      error.message
    );

    // Importante para que Vercel
    // sepa que la ejecución falló.
    throw error;

   } finally {
    console.log(
      '🔌 Cerrando conexión IMAP...'
    );

    if (client.usable) {
      client.close();
    }

    console.log(
      '✅ Conexión IMAP cerrada'
    );
  }
} // ← ESTA cierra scanEmails()


module.exports = {
  scanEmails
};


// Permite seguir ejecutando:
// node src/scanner.js

if (require.main === module) {
  scanEmails().catch((error) => {
    console.error(
      '❌ Scanner finalizado con error:',
      error.message
    );

    process.exitCode = 1;
  });
}