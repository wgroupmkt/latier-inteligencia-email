const {
  initializeApp,
  cert,
  getApps
} = require('firebase-admin/app');

const {
  getFirestore
} = require('firebase-admin/firestore');

function getFirebaseCredential() {
  // Producción / Vercel
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return cert({
      projectId:
        process.env.FIREBASE_PROJECT_ID,

      clientEmail:
        process.env.FIREBASE_CLIENT_EMAIL,

      privateKey:
        process.env.FIREBASE_PRIVATE_KEY.replace(
          /\\n/g,
          '\n'
        ),
    });
  }

  // Desarrollo local
  const serviceAccount =
    require('../serviceAccountKey.json');

  return cert(serviceAccount);
}

if (getApps().length === 0) {
  initializeApp({
    credential: getFirebaseCredential(),
  });
}

const db = getFirestore();

module.exports = {
  db,
};