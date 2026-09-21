const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const serviceAccount = require(
  path.join(__dirname, '../serviceAccountKey.json')
);

// Evita inicializar Firebase más de una vez
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

// Conexión a Firestore
const db = getFirestore();

module.exports = {
  db,
};