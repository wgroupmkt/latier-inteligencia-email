require('dotenv').config();
const { testImapConnection } = require('./src/email-reader');

console.log('Lantier Email Automation');
console.log('Primera etapa: prueba segura de conexión IMAP. No se enviarán correos.');

testImapConnection().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
