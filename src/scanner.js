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

async function saveCvAttachment(attachments, messageId) {
  const cvAttachment = attachments.find((attachment) => {
    const filename = (attachment.filename || '').toLowerCase();

    return (
      filename.endsWith('.pdf') ||
      filename.endsWith('.doc') ||
      filename.endsWith('.docx')
    );
  });

  if (!cvAttachment) {
    return null;
  }

  const originalName =
    cvAttachment.filename || 'cv.pdf';

  const extension = originalName
    .substring(originalName.lastIndexOf('.'))
    .toLowerCase();

  if (!['.pdf', '.doc', '.docx'].includes(extension)) {
    return null;
  }

  const fileHash = crypto
    .createHash('sha256')
    .update(messageId)
    .digest('hex');

  const storedName = `${fileHash}${extension}`;
  
  const blob = await put(
  `cvs/${storedName}`,
  cvAttachment.content,
  {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  }
);

  return {
    originalName,
    storedName,
    pathname: blob.pathname,
  };
}

async function scanEmails() {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    logger: false,
  });

  try {
    console.log('📡 Conectando al correo...');

    await client.connect();

    console.log('✅ Conectado');

    const lock = await client.getMailboxLock('INBOX');

    try {

     const unseenMessages = await client.search({
       seen: false,
      });


      console.log(
        `📨 Correos nuevos sin leer: ${unseenMessages.length}\n`
      );

      if (unseenMessages.length === 0) {
        console.log('✅ No hay correos nuevos para analizar.');
        return;
      }

      for await (const message of client.fetch(unseenMessages, {
        envelope: true,
        source: true,
        uid: true,
      })) {
        try {
          const parsed = await simpleParser(message.source);


          // Fecha y hora desde la cual funciona la automatización
          const automationStartDate =
            process.env.AUTOMATION_START_DATE;

          if (!automationStartDate) {
  throw new Error(
    'Falta configurar AUTOMATION_START_DATE'
  );
          }

          const emailDate = parsed.date;
          const startDate = new Date(automationStartDate);

          if (Number.isNaN(startDate.getTime())) {
  throw new Error(
    'AUTOMATION_START_DATE tiene un formato inválido'
  );
            }

           // Ignorar correos anteriores a la activación
           if (emailDate && emailDate < startDate) {
             console.log(
               `⏭️ Correo anterior a la activación: ${emailDate}`
             );

             continue;
           }
  
          // ID único del correo
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
            parsed.text ||
            '';

          const attachments =
            parsed.attachments || [];


            // Verificar si este correo ya fue procesado
          if (await isProcessed(messageId)) {
            console.log('⏭️ Este correo ya fue respondido anteriormente.');
            console.log('');
            continue;
          }

          const isCv = isCvEmail({
            subject,
            text,
            attachments,
          });

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`📩 De: ${from}`);
          console.log(`📧 Email: ${email || 'Sin email'}`);
          console.log(`📌 Asunto: ${subject}`);

          if (attachments.length > 0) {
            console.log(
              `📎 Adjuntos: ${attachments
                .map((a) => a.filename || 'archivo')
                .join(', ')}`
            );
          } else {
            console.log('📎 Adjuntos: ninguno');
          }

          console.log(
            `🤖 ¿Parece una postulación?: ${
              isCv ? '✅ SÍ' : '❌ NO'
            }`
          );

          // Si NO es CV, no respondemos
          if (!isCv) {
            console.log('⏭️ No se envía respuesta.\n');
            continue;
          }

          // Seguridad: necesitamos email del remitente
          if (!email) {
            console.log(
              '⚠️ No se encontró email del remitente. No se responde.\n'
            );
            continue;
          }

          // Guardar CV adjunto
const savedCv = await saveCvAttachment(
  attachments,
  messageId
);

if (savedCv) {
  console.log(
    `💾 CV guardado: ${savedCv.storedName}`
  );
} else {
  console.log(
    '⚠️ Postulación detectada sin PDF/DOC/DOCX.'
  );
}

          console.log(`📤 Enviando confirmación a ${email}...`);

          // Enviar respuesta automática
          await sendCvConfirmation({
            to: email,
          });

          console.log('✅ Confirmación enviada correctamente');


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

          console.log('🔥 Registro guardado en Firestore');

          // Marcar como leído SOLO después de enviar correctamente
          await client.messageFlagsAdd(
            message.uid,
            ['\\Seen'],
            { uid: true }
          );

          console.log('📬 Correo marcado como procesado');
          console.log('');

        } catch (error) {
          console.error(
            '❌ Error procesando el correo:',
            error.message
          );

          console.log(
            '⚠️ No se marca como procesado para poder reintentarlo.\n'
          );
        }
      }

    } finally {
      lock.release();
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);

  } finally {
    if (client.usable) {
      await client.logout();
    }
  }
}

module.exports = {
  scanEmails
};

// Permite ejecutarlo manualmente:
// node src/scanner.js
if (require.main === module) {
  scanEmails();
}