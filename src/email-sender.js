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

async function sendCvConfirmation({ to }) {
  const transporter = createTransporter();

  return transporter.sendMail({
    from: `Capital Humano Lantier <${process.env.EMAIL_USER}>`,
    to,

    subject: 'Hemos recibido tu CV - Lantier Business Group',

    text: `¡Hola! 👋🏻

Muchas gracias por enviarnos tu CV y por tu interés en sumarte a Lantier Business Group.

Queremos contarte que hemos recibido tu postulación correctamente. Nuestro equipo de Capital Humano se encuentra revisando los perfiles, y nos pondremos en contacto con vos en caso de que tu experiencia y perfil se ajusten a la búsqueda actual.

¡Te deseamos mucho éxito! 🍀

Saludos cordiales,
Equipo de Capital Humano
Lantier Business Group`,
  });
}

module.exports = { createTransporter, sendCvConfirmation };