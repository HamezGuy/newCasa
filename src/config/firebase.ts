import { FirebaseApp, initializeApp } from "firebase/app";
import { Auth, getAuth, GoogleAuthProvider } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { Functions, getFunctions } from "firebase/functions";

// Firebase configuration (from environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase App
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth: Auth = getAuth(app); // Authentication
const googleProvider: GoogleAuthProvider = new GoogleAuthProvider(); // Google Auth Provider
const db: Firestore = getFirestore(app); // Firestore database
const functions: Functions = getFunctions(app); // Cloud Functions

// Optionally enable Firestore offline persistence
// Uncomment this block if you need offline persistence for Firestore.
// if (process.env.NODE_ENV === 'development') {
//   enableIndexedDbPersistence(db).catch((error) => {
//     console.error("Firestore persistence error:", error);
//   });
// }

// Export the initialized Firebase services
export { auth, db, functions, googleProvider };

