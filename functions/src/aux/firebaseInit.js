require("dotenv").config({ path: "../../.env" });

const admin = require("firebase-admin");
const serviceAccount = require("../../credentials/firebase_credentials.json"); // Certifique-se que este caminho está correto

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
});

const db = admin.database();

module.exports = { admin, db };
