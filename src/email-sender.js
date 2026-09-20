require('dotenv').config();
const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

async function sendCvConfirmation({ to, name = 'Hola', position = '' }) {
  const transporter = createTransporter();
  const positionText = position ? ` para ${position}` : '';

  return transporter.sendMail({
    from: `Capital Humano Lantier <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Recibimos tu postulación',
    text: `${name},\n\nGracias por enviarnos tu CV. Hemos recibido correctamente tu postulación${positionText}. Nuestro equipo de Capital Humano revisará tu perfil y, en caso de avanzar en el proceso, nos pondremos en contacto con vos.\n\nSaludos,\nEquipo de Capital Humano\nLantier`,
  });
}

module.exports = { createTransporter, sendCvConfirmation };
