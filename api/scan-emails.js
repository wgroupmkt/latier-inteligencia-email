module.exports = async function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: 'API de Vercel funcionando'
  });
};