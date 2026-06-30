const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);

async function checkDb(dbId) {
  console.log(`Testing database: ${dbId || '(default)'}`);
  try {
    const db = getFirestore(app, dbId);
    const querySnapshot = await getDocs(collection(db, 'company_profile'));
    console.log(`Success! Total documents in company_profile for ${dbId || '(default)'}: ${querySnapshot.size}`);
    querySnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ID: ${doc.id}, Name: ${data.name}`);
    });
  } catch (err) {
    console.error(`Error for ${dbId || '(default)'}:`, err.message || err);
  }
}

async function check() {
  await checkDb(undefined);
  await checkDb('eazy-billing-db');
}

check().catch(console.error);
