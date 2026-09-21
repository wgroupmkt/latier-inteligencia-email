require('dotenv').config();

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { isCvEmail } = require('./cv-detector');
const { sendCvConfirmation } = require('./email-sender');

const {
  isProcessed,
  markAsProcessed
} = require('./processed-store');

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
      // Buscar solamente correos NO LEÍDOS
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
            attachments.length > 0
              ? attachments[0].filename
              : ''
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

scanEmails();