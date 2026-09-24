const { scanEmails } = require('../src/scanner');

module.exports = async function handler(req, res) {
  const start = Date.now();

  try {
    console.log('🚀 Iniciando scanEmails desde Vercel...');

    await scanEmails();

    const seconds = (
      (Date.now() - start) / 1000
    ).toFixed(2);

    console.log(
      `✅ Scanner terminado en ${seconds}s`
    );

    return res.status(200).json({
      success: true,
      message: 'Scanner ejecutado correctamente',
      duration: `${seconds}s`
    });

  } catch (error) {
    const seconds = (
      (Date.now() - start) / 1000
    ).toFixed(2);

    console.error(
      `❌ Scanner falló después de ${seconds}s:`,
      error
    );

    return res.status(500).json({
      success: false,
      error: error.message,
      duration: `${seconds}s`
    });
  }
};