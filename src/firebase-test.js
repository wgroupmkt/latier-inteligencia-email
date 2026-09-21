const { db } = require('./firebase');

async function testFirebase() {
  try {
    await db.collection('systemTests').add({
      message: 'Firebase conectado correctamente',
      createdAt: new Date(),
    });

    console.log('🔥 Firebase conectado correctamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error conectando Firebase:');
    console.error(error);
    process.exit(1);
  }
}

testFirebase();