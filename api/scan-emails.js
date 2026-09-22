const { scanEmails } = require('../src/scanner');

module.exports = async function handler(req, res) {
  try {
    // Vercel Cron utiliza GET
    if (req.method !== 'GET') {
      return res.status(405).json({
        error: 'Method not allowed'
      });
    }

    console.log('🤖 Iniciando scanner desde Vercel...');

    await scanEmails();

    return res.status(200).json({
      success: true,
      message: 'Scanner ejecutado correctamente'
    });

  } catch (error) {
    console.error(
      '❌ Error ejecutando scanner:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Error ejecutando scanner'
    });
  }
};