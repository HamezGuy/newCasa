import * as dotenv from "dotenv";
import * as functions from "firebase-functions";

// Load .env file in local development
if (process.env.NODE_ENV !== "production") {
  dotenv.config(); // Load variables from .env
}

export const config = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ||
      functions.config().twilio?.sid || "",
    authToken: process.env.TWILIO_AUTH_TOKEN ||
      functions.config().twilio?.token || "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER ||
      functions.config().twilio?.phone_number || "",
  },
  email: {
    user: process.env.EMAIL_USER ||
      functions.config().email?.user || "",
    pass: process.env.EMAIL_PASS ||
      functions.config().email?.pass || "",
  },
  firebase: {
    apiKey: process.env.APP_FIREBASE_API_KEY ||
      functions.config().firebase?.api_key || "",
    authDomain: process.env.APP_FIREBASE_AUTH_DOMAIN ||
      functions.config().firebase?.auth_domain || "",
    projectId: process.env.APP_FIREBASE_PROJECT_ID ||
      functions.config().firebase?.project_id || "",
    storageBucket: process.env.APP_FIREBASE_STORAGE_BUCKET ||
      functions.config().firebase?.storage_bucket || "",
    messagingSenderId: process.env.APP_FIREBASE_MESSAGING_SENDER_ID ||
      functions.config().firebase?.messaging_sender_id || "",
    appId: process.env.APP_FIREBASE_APP_ID ||
      functions.config().firebase?.app_id || "",
  },
};
