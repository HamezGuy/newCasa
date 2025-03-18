import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";
import twilio from "twilio";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Describes the shape of a successful operation result.
 */
interface OperationResult {
  success: boolean;
  message: string;
}

/**
 * Data for sending a message to a realtor.
 */
interface MessageData {
  message: string;
  clientEmail: string;
  propertyId: string;
  clientId: string;
  realtorEmail?: string;
  realtorPhoneNumber?: string;
}

/**
 * Data for assigning user roles.
 */
interface UserRoleData {
  uid: string;
  role?: string;
}

// Configure CORS middleware with appropriate origins
const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests from any origin
    callback(null, true);
  },
  credentials: true,
});

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Helper function to get environment variables or Firebase secrets.
 * @param {string} name - The name of the environment variable.
 * @param {string} [fallback] - Fallback value if missing.
 * @return {string} The environment variable or the fallback.
 * @throws {Error} If the environment variable and no fallback
 */
function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value) return value;
  if (fallback) return fallback;
  throw new Error(`Environment variable ${name} is missing.`);
}

/**
 * Processes a message and sends it to the realtor via email and SMS.
 * @param {MessageData} data - The message data to process.
 * @return {Promise<OperationResult>} A promise with the operation result.
 */
async function handleMessage(data: MessageData): Promise<OperationResult> {
  console.log("Starting handleMessage with data:",
    JSON.stringify(data, null, 2));

  const twilioSid = getEnvVar("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = getEnvVar("TWILIO_AUTH_TOKEN");
  const twilioPhoneNumber = getEnvVar("TWILIO_PHONE_NUMBER");
  const emailUser = getEnvVar("EMAIL_USER");
  const emailPass = getEnvVar("EMAIL_PASS");

  const {
    message,
    clientEmail,
    propertyId,
    clientId,
    realtorEmail,
    realtorPhoneNumber,
  } = data;

  const targetEmail = realtorEmail ||
    getEnvVar("REALTOR_EMAIL", "tim.flores@flores.realty");
  const targetPhone = realtorPhoneNumber ||
    getEnvVar("REALTOR_PHONE_NUMBER", "+16085793033");

  const twilioClient = twilio(twilioSid, twilioAuthToken);

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
    recipientEmail: targetEmail,
    recipientPhone: targetPhone,
  });

  try {
    // Using admin SDK to bypass security rules
    console.log(`Checking for existing chat with ID: ${propertyId}`);
    const chatDocRef = db.collection("chats").doc(propertyId);
    const chatSnapshot = await chatDocRef.get();

    if (!chatSnapshot.exists) {
      console.log(`Creating new chat document for property ${propertyId}`);
      await chatDocRef.set({
        propertyId,
        clientId,
        clientEmail,
        realtorEmail: targetEmail,
        realtorPhoneNumber: targetPhone,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      console.log(`Updating existing chat document for property ${propertyId}`);
      await chatDocRef.update({
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    try {
      console.log(`Adding message to Firestore for chat ${propertyId}`);
      const messageRef = await db.collection("messages").add({
        chatId: propertyId,
        sender: "client",
        message,
        propertyId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Message stored in Firestore with ID: ${messageRef.id}`);
    } catch (error: unknown) {
      console.error("Error storing message in Firestore:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to store message in Firestore"
      );
    }

    try {
      console.log(`Sending SMS to ${targetPhone}`);
      await twilioClient.messages.create({
        body: `Property ID: ${propertyId}\nMessage: ${message}`,
        from: twilioPhoneNumber,
        to: targetPhone,
      });
      console.log("SMS sent successfully to", targetPhone);
    } catch (error: unknown) {
      console.error("Failed to send SMS:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send SMS via Twilio"
      );
    }

    const mailOptions = {
      from: emailUser,
      to: targetEmail,
      subject: `Message about Property ID: ${propertyId}`,
      text: `Message from client (${clientEmail}):\n\n${message}`,
      html:
        `<p><strong>Property ID:</strong> ${propertyId}</p>` +
        `<p><strong>From:</strong> ${clientEmail}</p>` +
        "<p><strong>Message:</strong></p>" +
        `<p>${message}</p>`,
    };

    try {
      console.log(`Sending email to ${targetEmail}`);
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {user: emailUser, pass: emailPass},
      });
      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully to", targetEmail);
    } catch (error: unknown) {
      console.error("Failed to send email:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send email via Nodemailer"
      );
    }

    return {success: true, message: "Message sent successfully!"};
  } catch (error: unknown) {
    console.error("Error in handleMessage:", error);
    const errorMessage =
    error instanceof Error ? error.message : "Unknown error";
    throw new functions.https.HttpsError(
      "internal",
      `Failed to process message: ${errorMessage}`
    );
  }
}

/**
 * Assigns a role to a user by updating Firestore and user claims.
 * @param {UserRoleData} data - User role data.
 * @return {Promise<OperationResult>} A promise with the operation result.
 */
async function handleUserRole(data: UserRoleData): Promise<OperationResult> {
  const {uid, role = "realtor"} = data;

  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "Missing UID");
  }

  try {
    await db.collection("users").doc(uid).set(
      {
        role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
    await admin.auth().setCustomUserClaims(uid, {role});
    return {success: true, message: "User role assigned successfully"};
  } catch (error: unknown) {
    console.error("Failed to assign user role:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to assign user role"
    );
  }
}

// HTTP functions (Gen 1 compatible) - UPDATED to better handle CORS
exports.sendMessageToRealtorHttp = functions.https.onRequest(
  (req, res) => {
    // Set CORS headers for all responses
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");

    // Handle preflight requests directly
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    return corsMiddleware(req, res, async () => {
      try {
        // Ensure request is POST
        if (req.method !== "POST") {
          res.status(405).json({error: "Method not allowed"});
          return;
        }

        console.log("HTTP function called with body:", req.body);
        const result = await handleMessage(req.body as MessageData);
        res.status(200).json(result);
      } catch (error: unknown) {
        console.error("Error in HTTP function:", error);
        const errorMessage = error instanceof Error ?
          error.message :
          "Internal server error";
        res.status(500).json({
          error: errorMessage,
          code: error instanceof functions.https.HttpsError ?
            (error as functions.https.HttpsError).code :
            "unknown",
        });
      }
    });
  }
);

// First-generation callable functions format with original names
exports.sendMessageToRealtor = functions.https.onCall(
  async (data, context) => {
    console.log("Callable function called with data:", data);
    console.log("Auth context:", context.auth);

    try {
      return await handleMessage(data as MessageData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ?
        error.message :
        "Failed to process message";
      console.error("Error in sendMessageToRealtor:", error);
      throw new functions.https.HttpsError("internal", errorMessage);
    }
  }
);

exports.assignUserRole = functions.https.onCall(
  async (data, context) => {
    try {
      return await handleUserRole(data as UserRoleData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ?
        error.message :
        "Failed to assign user role";
      console.error("Error assigning user role:", error);
      throw new functions.https.HttpsError("internal", errorMessage);
    }
  }
);

exports.handleIncomingSms = functions.https.onRequest((req, res) => {
  // Set CORS headers for SMS handler too
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  return corsMiddleware(req, res, async () => {
    const fromNumber = req.body.From as string;
    const messageBody = req.body.Body as string;
    const messageSid = req.body.MessageSid as string;

    console.log("Incoming SMS from:", fromNumber, "Message:", messageBody);

    // Extract property ID if the message follows the format:
    // "PROP123: your message"
    let chatId: string | null = null;
    let messageContent = messageBody;

    const propertyMatch = messageBody.match(
      /^(?:PROP|Property|#)?\s*(\w+):\s*(.*)/i
    );
    if (propertyMatch) {
      chatId = propertyMatch[1];
      messageContent = propertyMatch[2];
    } else {
      const chatQuery = await db
        .collection("chats")
        .where("realtorPhoneNumber", "==", fromNumber)
        .orderBy("lastActivity", "desc")
        .limit(1)
        .get();

      if (!chatQuery.empty) {
        chatId = chatQuery.docs[0].id;
      }
    }

    if (!chatId) {
      console.error("No chat found for this phone number");
      res.status(200).send(
        "<Response><Message>Please specify a property ID " +
        "(e.g., \"PROP123: your message\")</Message></Response>"
      );
      return;
    }

    try {
      await db.collection("messages").add({
        chatId,
        sender: "realtor",
        message: messageContent,
        propertyId: chatId,
        twilioSid: messageSid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection("chats").doc(chatId).update({
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Message stored in Firestore");

      res.status(200).send(
        "<Response><Message>Message delivered to client</Message>" +
        "</Response>"
      );
    } catch (error: unknown) {
      console.error("Error storing message:", error);
      res.status(500).send("Failed to store message in Firestore");
    }
  });
});

exports.testFirestoreConnection = functions.https.onRequest(
  (req, res) => {
    // Set CORS headers for test function too
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    return corsMiddleware(req, res, async () => {
      try {
        const testDoc = await db.collection("testCollection").add({
          message: "Hello Firestore!",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log("Test document written with ID:", testDoc.id);
        res.status(200).send(
          "Connected to Firestore. " +
          "Test document created."
        );
      } catch (error: unknown) {
        console.error("Error writing test document:", error);
        res.status(500).send("Failed to connect to Firestore");
      }
    });
  }
);

// V1 function backward compatibility
exports.sendMessageToRealtorV1 = exports.sendMessageToRealtor;
exports.assignUserRoleV1 = exports.assignUserRole;
exports.handleIncomingSmsV1 = exports.handleIncomingSms;
exports.testFirestoreConnectionV1 = exports.testFirestoreConnection;
exports.sendMessageToRealtorHttpV1 = exports.sendMessageToRealtorHttp;
