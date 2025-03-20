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
  // If user is not logged in, front-end sets "guest-<timestamp>"
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
    // Allow requests from any origin for flexibility
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
 * Check if a user is considered "logged in" based on clientId.
 * Here we assume "guest-*" means not logged in.
 * Adjust this logic if you use a different approach.
 * @param {string} clientId - The client identifier to check.
 * @return {boolean} True if the user is logged in, false otherwise.
 */
function isUserLoggedIn(clientId: string): boolean {
  return !clientId.startsWith("guest-");
}

/**
 * Processes a message and sends it to the realtor via email and SMS.
 * If the user is logged in, also writes to Firestore.
 * @param {MessageData} data - The message data to process.
 * @return {Promise<OperationResult>} A promise with the operation result.
 */
async function handleMessage(data: MessageData): Promise<OperationResult> {
  console.log(
    "Starting handleMessage with data:",
    JSON.stringify(data, null, 2)
  );

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

  const targetEmail =
    realtorEmail || getEnvVar("REALTOR_EMAIL", "tim.flores@flores.realty");
  const targetPhone =
    realtorPhoneNumber ||
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

  // Check if user is logged in (based on clientId format).
  // Only write to Firestore if the user is logged in.
  const userLoggedIn = isUserLoggedIn(clientId);

  try {
    if (userLoggedIn) {
      // Using admin SDK to bypass security rules
      console.log(
        `User is logged in. Checking/updating chat with ID: ${propertyId}`
      );
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
        console.log(
          `Updating existing chat document for property ${propertyId}`
        );
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
    } else {
      console.log("User is NOT logged in. Skipping Firestore writes.");
    }

    // Try to send SMS, but don't block the whole operation if it fails
    let smsSuccess = false;
    try {
      console.log(`Sending SMS to ${targetPhone}`);
      await twilioClient.messages.create({
        body: `Property ID: ${propertyId}\nMessage: ${message}`,
        from: twilioPhoneNumber,
        to: targetPhone,
      });
      console.log("SMS sent successfully to", targetPhone);
      smsSuccess = true;
    } catch (error: unknown) {
      console.error("Failed to send SMS:", error);
    }

    // Try to send email
    let emailSuccess = false;
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
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully to", targetEmail);
      emailSuccess = true;
    } catch (error: unknown) {
      console.error("Failed to send email:", error);
    }

    // Determine final status based on smsSuccess/emailSuccess
    if (!smsSuccess && !emailSuccess) {
      throw new Error("Failed to send both SMS and email notifications");
    }

    let successMessage = "Message processed.";
    if (userLoggedIn) {
      successMessage += " Stored in Firestore.";
    } else {
      successMessage += " Skipped Firestore writes (anonymous user).";
    }

    if (smsSuccess && emailSuccess) {
      successMessage += " Sent via SMS and email.";
    } else if (smsSuccess) {
      successMessage += " Sent via SMS (email failed).";
    } else if (emailSuccess) {
      successMessage += " Sent via email (SMS failed).";
    }

    return {success: true, message: successMessage};
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

/**
 * HTTP function to send messages to realtors.
 * Includes enhanced CORS handling and error reporting.
 */
exports.sendMessageToRealtorHttp = functions.https.onRequest((req, res) => {
  console.log(
    `Received ${req.method} request to sendMessageToRealtorHttp ` +
      `from origin: ${req.headers.origin}`
  );
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.set("Access-Control-Max-Age", "3600");
  if (req.method === "OPTIONS") {
    console.log("Responding to OPTIONS/preflight request");
    res.status(204).send("");
    return;
  }
  return corsMiddleware(req, res, async () => {
    try {
      if (req.method !== "POST") {
        console.error(`Invalid method: ${req.method}, expected POST`);
        res.status(405).json({
          success: false,
          error: "Method not allowed",
          message: "Only POST method is supported",
        });
        return;
      }
      if (!req.body || typeof req.body !== "object") {
        console.error("Invalid request body format:", req.body);
        res.status(400).json({
          success: false,
          error: "invalid-argument",
          message: "Invalid request body format",
        });
        return;
      }
      console.log("HTTP function called with body:", req.body);
      const result = await handleMessage(req.body as MessageData);
      console.log("Message processed successfully:", result);
      res.status(200).json(result);
    } catch (error: unknown) {
      console.error("Error in HTTP function:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Internal server error";
      const errorCode =
        error instanceof functions.https.HttpsError ?
          (error as functions.https.HttpsError).code :
          "unknown";
      res.status(500).json({
        success: false,
        error: errorCode,
        message: errorMessage,
      });
    }
  });
});

/**
 * Callable function to send messages to realtors.
 */
exports.sendMessageToRealtor = functions.https.onCall(
  async (data) => {
    console.log("Callable function called with data:", data);
    try {
      return await handleMessage(data as MessageData);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process message";
      console.error("Error in sendMessageToRealtor:", error);
      throw new functions.https.HttpsError("internal", errorMessage);
    }
  }
);

/**
 * Callable function to assign user roles.
 */
exports.assignUserRole = functions.https.onCall(async (data) => {
  try {
    return await handleUserRole(data as UserRoleData);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to assign user role";
    console.error("Error assigning user role:", error);
    throw new functions.https.HttpsError("internal", errorMessage);
  }
});

/**
 * HTTP function to handle incoming SMS messages.
 */
exports.handleIncomingSms = functions.https.onRequest((req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.set("Access-Control-Max-Age", "3600");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  return corsMiddleware(req, res, async () => {
    console.log("Received SMS webhook:", req.body);
    if (!req.body || !req.body.From || !req.body.Body) {
      console.error("Missing required fields in SMS webhook");
      res
        .status(400)
        .send("<Response>Invalid SMS webhook</Message></Response>");
      return;
    }
    const fromNumber = req.body.From as string;
    const messageBody = req.body.Body as string;
    const messageSid = req.body.MessageSid as string;
    console.log("Incoming SMS from:", fromNumber, "Message:", messageBody);
    let chatId: string | null = null;
    let messageContent = messageBody;
    const propertyMatch = messageBody.match(
      /^(?:PROP|Property|#)?\s*(\w+):\s*(.*)/i
    );
    if (propertyMatch) {
      chatId = propertyMatch[1];
      messageContent = propertyMatch[2];
      console.log(`Extracted property ID ${chatId} from message`);
    } else {
      console.log("No property ID in message, searching for recent chat");
      const chatQuery = await db
        .collection("chats")
        .where("realtorPhoneNumber", "==", fromNumber)
        .orderBy("lastActivity", "desc")
        .limit(1)
        .get();
      if (!chatQuery.empty) {
        chatId = chatQuery.docs[0].id;
        console.log(`Found matching chat with ID ${chatId}`);
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
      // We assume realtor is always "logged in" for SMS?
      const messageRef = await db.collection("messages").add({
        chatId,
        sender: "realtor",
        message: messageContent,
        propertyId: chatId,
        twilioSid: messageSid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Message stored in Firestore with ID: ${messageRef.id}`);
      await db.collection("chats").doc(chatId).update({
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Updated last activity for chat ${chatId}`);
      const chatDoc = await db.collection("chats").doc(chatId).get();
      if (chatDoc.exists && chatDoc.data()?.clientEmail) {
        const clientEmail = chatDoc.data()?.clientEmail;
        console.log(`Found client email: ${clientEmail}`);
      }
      res
        .status(200)
        .send("<Response><Message>Message delivered</Message></Response>");
    } catch (error: unknown) {
      console.error("Error storing message:", error);
      res
        .status(500)
        .send(
          "<Response><Message>Failed to store your message</Message>" +
          "</Response>"
        );
    }
  });
});

/**
 * Test function to verify Firestore connection.
 */
exports.testFirestoreConnection = functions.https.onRequest((req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.set("Access-Control-Max-Age", "3600");
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
      res.status(200).json({
        success: true,
        message: "Connected to Firestore. Test document created.",
        documentId: testDoc.id,
      });
    } catch (error: unknown) {
      console.error("Error writing test document:", error);
      res.status(500).json({
        success: false,
        error: "database-error",
        message: "Failed to connect to Firestore",
      });
    }
  });
});

// V1 function aliases for backward compatibility
exports.sendMessageToRealtorV1 = functions.https.onCall(
  async (data) => {
    console.log("V1 callable function called with data:", data);
    try {
      return await handleMessage(data as MessageData);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process message";
      console.error("Error in sendMessageToRealtorV1:", error);
      throw new functions.https.HttpsError("internal", errorMessage);
    }
  }
);

exports.assignUserRoleV1 = exports.assignUserRole;
exports.handleIncomingSmsV1 = exports.handleIncomingSms;
exports.testFirestoreConnectionV1 = exports.testFirestoreConnection;

/**
 * Create a separate HTTP handler for V1 to ensure it's properly exported
 */
exports.sendMessageToRealtorHttpV1 = functions.https.onRequest((req, res) => {
  console.log(
    `Received ${req.method} request to sendMessageToRealtorHttpV1 ` +
      `from origin: ${req.headers.origin}`
  );
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.set("Access-Control-Max-Age", "3600");
  if (req.method === "OPTIONS") {
    console.log("Responding to OPTIONS/preflight request (V1)");
    res.status(204).send("");
    return;
  }
  return corsMiddleware(req, res, async () => {
    try {
      if (req.method !== "POST") {
        console.error(`Invalid method: ${req.method}, expected POST (V1)`);
        res.status(405).json({
          success: false,
          error: "Method not allowed",
          message: "Only POST method is supported",
        });
        return;
      }
      if (!req.body || typeof req.body !== "object") {
        console.error("Invalid request body format (V1):", req.body);
        res.status(400).json({
          success: false,
          error: "invalid-argument",
          message: "Invalid request body format",
        });
        return;
      }
      console.log("HTTP V1 function called with body:", req.body);
      const result = await handleMessage(req.body as MessageData);
      console.log("Message processed successfully (V1):", result);
      res.status(200).json(result);
    } catch (error: unknown) {
      console.error("Error in HTTP V1 function:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Internal server error";
      const errorCode =
        error instanceof functions.https.HttpsError ?
          (error as functions.https.HttpsError).code :
          "unknown";
      res.status(500).json({
        success: false,
        error: errorCode,
        message: errorMessage,
      });
    }
  });
});
