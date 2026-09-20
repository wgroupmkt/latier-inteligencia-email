require('dotenv').config();

const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { isCvEmail } = require('./cv-detector');

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

      const total = client.mailbox.exists;

      console.log(`📬 Total de correos: ${total}`);
      console.log('🔎 Analizando los últimos 20...\n');

      if (total === 0) {
        console.log('No hay correos.');
        return;
      }

      const start = Math.max(1, total - 19);
      const range = `${start}:${total}`;

      for await (const message of client.fetch(range, {
        envelope: true,
        source: true
      })) {

        try {

          const parsed = await simpleParser(message.source);

          const from =
            parsed.from?.value?.[0]?.name ||
            parsed.from?.value?.[0]?.address ||
            'Desconocido';

          const email =
            parsed.from?.value?.[0]?.address ||
            'Sin email';

          const subject =
            parsed.subject ||
            '(Sin asunto)';

          const text =
            parsed.text ||
            '';

          const attachments =
            parsed.attachments || [];

          const isCv = isCvEmail({
            subject,
            text,
            attachments
          });

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          console.log(`📩 De: ${from}`);
          console.log(`📧 Email: ${email}`);
          console.log(`📌 Asunto: ${subject}`);

          if (attachments.length > 0) {

            console.log(
              `📎 Adjuntos: ${attachments
                .map(a => a.filename || 'archivo')
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

          console.log('');

        } catch (error) {

          console.error(
            '⚠️ No se pudo analizar un correo:',
            error.message
          );

        }

      }

    } finally {

      lock.release();

    }

  } catch (error) {

    console.error('❌ Error:', error.message);

  } finally {

    if (client.usable) {
      await client.logout();
    }

  }

}

scanEmails();