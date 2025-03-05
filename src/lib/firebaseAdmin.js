// /lib/firebaseAdmin.ts
import admin from "firebase-admin";

// READ from .env
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID; // "newcasa-feecb"
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";

// If your .env key has literal "\n" rather than actual newlines:
privateKey = privateKey.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Missing Firebase Admin environment variables. Check your .env.");
}

// Ensure we only initialize once (in case of hot reload)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export const firestoreAdmin = admin.firestore();
