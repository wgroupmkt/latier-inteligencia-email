const { db } = require('./firebase');

const COLLECTION = 'emailApplications';

// Verificar si un correo ya fue respondido
async function isProcessed(messageId) {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .where('messageId', '==', messageId)
      .limit(1)
      .get();

    return !snapshot.empty;

  } catch (error) {
    console.error(
      '❌ Error consultando Firestore:',
      error.message
    );

    throw error;
  }
}

// Registrar correo respondido
async function markAsProcessed({
  messageId,
  name,
  email,
  subject,
  attachmentName,
  cvStoredName,
  cvStored
}) {
  try {
    await db.collection(COLLECTION).add({
      messageId,
      name: name || '',
      email,
      subject,
      attachmentName: attachmentName || '',

      // Archivo del CV
      cvStoredName: cvStoredName || '',
      cvStored: cvStored || false,

      detectedAsCv: true,

      responseSent: true,
      responseSubject:
        'Hemos recibido tu CV - Lantier Business Group',

      status: 'sent',

      respondedAt: new Date()
    });

  } catch (error) {
    console.error(
      '❌ Error guardando en Firestore:',
      error.message
    );

    throw error;
  }
}

module.exports = {
  isProcessed,
  markAsProcessed
};