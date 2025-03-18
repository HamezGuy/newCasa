import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth, GoogleAuthProvider } from "firebase/auth";
import { Firestore, getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { Functions, getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

// Firebase configuration (from environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase App if it hasn't been initialized yet
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]; // Use the already initialized app
}

// Initialize Firebase services
const auth: Auth = getAuth(app); // Authentication
const googleProvider: GoogleAuthProvider = new GoogleAuthProvider(); // Google Auth Provider
const db: Firestore = getFirestore(app); // Firestore database
const functions: Functions = getFunctions(app, "us-central1"); // Explicitly set region

// Set up emulator connections for development environment
if (process.env.NODE_ENV === 'development') {
  try {
    // Uncomment the lines below if you're running local emulators
    // connectFirestoreEmulator(db, 'localhost', 8080);
    // connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('Development environment detected');
  } catch (e) {
    console.warn('Could not connect to Firebase emulators:', e);
  }
}

// Helper function to call Firebase functions with proper error handling
export const callFunction = async (name: string, data: any) => {
  try {
    // First try to use the Next.js API route as a proxy
    const apiPath = `/api/v1/${name}`;
    console.log(`Attempting to call function via Next.js API: ${apiPath}`);
    
    const response = await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("API error response:", errorData);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.warn(`Next.js API proxy failed, falling back to direct Firebase function call: ${name}`, error);
    
    // Fall back to direct Firebase function call
    const functionCall = httpsCallable(functions, name);
    try {
      const result = await functionCall(data);
      return result.data;
    } catch (fbError: any) {
      console.error("Error calling Firebase function directly:", fbError);
      throw new Error(`Firebase function error (${name}): ${fbError.message || 'Unknown error'}`);
    }
  }
};

// Export the initialized Firebase services
export { auth, db, functions, googleProvider };