import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import nodemailer from "nodemailer";
import twilio from "twilio";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

/**
 * Helper function to get environment variables or Firebase secrets.
 * @param {string} name - The name of the environment variable.
 * @param {string} [fallback] - Fallback value if the variable is missing.
 * @return {string} - The value of the environment variable or fallback.
 * @throws Will throw an error if the environment variable is not found.
 */
function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value) return value;
  if (fallback) return fallback;
  throw new Error(`Environment variable ${name} is missing.`);
}

/**
 * Sends a message to a realtor and updates Firestore.
 */
export const sendMessageToRealtor = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<{
      message: string;
      clientEmail: string;
      propertyId: string;
      clientId: string;
    }>
  ) => {
    const twilioSid = getEnvVar("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = getEnvVar("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = getEnvVar("TWILIO_PHONE_NUMBER");
    const emailUser = getEnvVar("EMAIL_USER");
    const emailPass = getEnvVar("EMAIL_PASS");
    const realtorEmail = getEnvVar("REALTOR_EMAIL");
    const realtorPhoneNumber = getEnvVar("REALTOR_PHONE_NUMBER");

    const twilioClient = twilio(twilioSid, twilioAuthToken);

    const {message, clientEmail, propertyId, clientId} = request.data;

    if (!propertyId || !clientId || !message.trim()) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: propertyId, clientId, or message"
      );
    }

    console.log("Message received:", {
      message,
      clientEmail,
      propertyId,
      clientId,
    });

    const chatDocRef = db.collection("chats").doc(propertyId);
    const chatSnapshot = await chatDocRef.get();

    if (!chatSnapshot.exists) {
      await chatDocRef.set({
        propertyId,
        clientId,
        realtorEmail,
        realtorPhoneNumber,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    try {
      await db.collection("messages").add({
        chatId: propertyId,
        sender: "client",
        message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Message stored in Firestore");
    } catch (error) {
      console.error("Error storing message:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to store message in Firestore"
      );
    }

    try {
      await twilioClient.messages.create({
        body: `Property ID: ${propertyId}\nMessage: ${message}`,
        from: twilioPhoneNumber,
        to: realtorPhoneNumber,
      });
      console.log("SMS sent successfully");
    } catch (error) {
      console.error("Failed to send SMS:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send SMS via Twilio"
      );
    }

    const mailOptions = {
      from: emailUser,
      to: realtorEmail,
      subject: `Message about Property ID: ${propertyId}`,
      text: message,
    };

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {user: emailUser, pass: emailPass},
      });
      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully");
    } catch (error) {
      console.error("Failed to send email:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send email via Nodemailer"
      );
    }

    return {success: true, message: "Message sent successfully!"};
  }
);

/**
 * Handles incoming SMS messages and updates Firestore.
 */
export const handleIncomingSms = functions.https.onRequest(
  async (req, res) => {
    const fromNumber = req.body.From;
    const messageBody = req.body.Body;

    console.log("Incoming SMS from:", fromNumber, "Message:", messageBody);

    let chatId: string | null = null;
    const chatQuery = await db
      .collection("chats")
      .where("realtorPhoneNumber", "==", fromNumber)
      .limit(1)
      .get();

    if (!chatQuery.empty) {
      chatId = chatQuery.docs[0].id;
    }

    if (!chatId) {
      console.error("No chat found for this phone number");
      res.status(400).send("No chat found for this phone number");
      return;
    }

    try {
      await db.collection("messages").add({
        chatId,
        sender: "realtor",
        message: messageBody,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Message stored in Firestore");
      res.status(200).send(
        "<Response><Message>Message received</Message></Response>"
      );
    } catch (error) {
      console.error("Error storing message:", error);
      res.status(500).send("Failed to store message in Firestore");
    }
  }
);

/**
 * Assigns a role to a user and updates Firestore.
 */
export const assignUserRole = functions.https.onCall(
  async (request: functions.https
    .CallableRequest<{ uid: string; role?: string }>) => {
    const {uid, role = "realtor"} = request.data;

    if (!uid) {
      throw new functions.https.HttpsError("invalid-argument", "Missing UID");
    }

    try {
      await db.collection("users").doc(uid).set(
        {role, updatedAt: admin.firestore.FieldValue.serverTimestamp()},
        {merge: true}
      );
      await admin.auth().setCustomUserClaims(uid, {role});
      return {success: true, message: "User role assigned successfully"};
    } catch (error) {
      console.error("Failed to assign user role:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to assign user role"
      );
    }
  }
);

/**
 * Tests Firestore connection by adding a test document.
 */
export const testFirestoreConnection = functions.https.onRequest(
  async (req, res) => {
    try {
      const testDoc = await db.collection("testCollection").add({
        message: "Hello Firestore!",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Test document written with ID:", testDoc.id);
      res.status(200).send("Connected to Firestore. Test document created.");
    } catch (error) {
      console.error("Error writing test document:", error);
      res.status(500).send("Failed to connect to Firestore");
    }
  }
);
