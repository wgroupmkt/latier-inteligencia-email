require('dotenv').config();
const { ImapFlow } = require('imapflow');

async function testImapConnection() {

  console.log('🔍 Configuración:');
  console.log('Usuario:', process.env.EMAIL_USER);
  console.log('Servidor:', process.env.IMAP_HOST);
  console.log('Puerto:', process.env.IMAP_PORT);
  console.log(
    'Contraseña cargada:',
    process.env.EMAIL_PASSWORD ? 'SÍ' : 'NO'
  );

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

    console.log('\n📡 Intentando conectar con IMAP...');

    await client.connect();

    console.log('✅ Conectado al servidor IMAP');

    const lock = await client.getMailboxLock('INBOX');

    try {

      console.log(
        `📬 Correos encontrados en Entrada: ${client.mailbox.exists}`
      );

    } finally {

      lock.release();

    }

  } catch (error) {

    console.error('\n❌ ERROR IMAP');
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    console.error('Response:', error.response);
    console.error('Response Status:', error.responseStatus);
    console.error('Command:', error.command);

    throw error;

  } finally {

    if (client.usable) {
      await client.logout();
    }

  }
}

if (require.main === module) {

  testImapConnection().catch(() => {
    process.exit(1);
  });

}

module.exports = { testImapConnection };