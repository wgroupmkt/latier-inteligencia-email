require('dotenv').config();

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { isCvEmail } = require('./cv-detector');
const { classifyCv } = require('./cv-classifier');
const { db } = require('./firebase');

async function importHistoricalEmails() {

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

      // Por ahora analizamos los correos no leídos existentes
      const messages = await client.search({
        seen: false,
      });

      console.log(`📨 Correos encontrados: ${messages.length}\n`);

      let cvCount = 0;
      let nonCvCount = 0;

      for await (
        const message of client.fetch(messages, {
          envelope: true,
          source: true,
          uid: true,
        })
      ) {

        try {

          const parsed = await simpleParser(message.source);


        const messageId =
               parsed.messageId ||
               `uid-${message.uid}`;

          const name =
            parsed.from?.value?.[0]?.name ||
            'Desconocido';

          const email =
            parsed.from?.value?.[0]?.address ||
            '';

          const subject =
            parsed.subject ||
            '(Sin asunto)';

          const text =
            parsed.text ||
            '';

          const attachments =
            parsed.attachments ||
            [];

          const isCv = isCvEmail({
            subject,
            text,
            attachments,
          });

          // No es CV → ignorar
          if (!isCv) {
            nonCvCount++;
            continue;
          }

          cvCount++;

          const category = classifyCv({
            subject,
            text,
            attachments,
          });



          // Verificar si ya fue importado
          const existing = await db
            .collection('emailApplications')
            .where('messageId', '==', messageId)
            .limit(1)
            .get();

          if (!existing.empty) {
            console.log(`⏭️ Ya importado: ${email}`);
           continue;
          }

          const attachmentName =
            attachments.length > 0
              ? attachments[0].filename || ''
              : '';

          // Guardar candidato histórico
          await db.collection('emailApplications').add({
            messageId,

            name,
            email,

            category,

            subject,

            attachmentName,

            detectedAsCv: true,

            responseSent: false,

            status: 'historical',

            receivedAt:
              parsed.date || null,

            importedAt:
              new Date(),
          });

          console.log(`🔥 Guardado en Firebase: ${name}`);

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`👤 ${name}`);
          console.log(`📧 ${email}`);
          console.log(`📌 ${subject}`);
          console.log(`🏷️ Categoría: ${category}`);

          if (attachments.length > 0) {
            console.log(
              `📎 ${attachments
                .map((a) => a.filename || 'archivo')
                .join(', ')}`
            );
          } else {
            console.log('📎 Sin archivo adjunto');
          }

          console.log('');

        } catch (error) {

          console.error(
            '❌ Error analizando correo:',
            error.message
          );

        }
      }

      console.log('================================');
      console.log('📊 RESULTADO');
      console.log(`📨 Analizados: ${messages.length}`);
      console.log(`📄 CV detectados: ${cvCount}`);
      console.log(`🚫 No CV: ${nonCvCount}`);
      console.log('');
      console.log('✅ IMPORTACIÓN FINALIZADA');
      console.log('📤 No se envió ningún correo.');
      console.log('🔥 Los CV detectados fueron guardados en Firebase.');

    } finally {

      lock.release();

    }

  } catch (error) {

    console.error(
      '❌ Error general:',
      error.message
    );

  } finally {

    if (client.usable) {
      await client.logout();
    }

  }
}

importHistoricalEmails();