require('dotenv').config();

const {
  testImapConnection
} = require('../src/email-reader');

module.exports = async function handler(req, res) {
  try {
    console.log('📬 Probando conexión IMAP...');

    await testImapConnection();

    console.log('✅ IMAP conectado correctamente');

    return res.status(200).json({
      success: true,
      message: 'Conexión IMAP correcta'
    });

  } catch (error) {
    console.error('❌ Error IMAP:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};