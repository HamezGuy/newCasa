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
 * Interface for the message data structure
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
 * Interface for the user role data structure
 */
interface UserRoleData {
  uid: string;
  role?: string;
}

/**
 * Processes a message and sends it to the realtor via email and SMS.
 * @param {MessageData} data The message data to process
 * @return {Promise<{success: boolean, message: string}>} Operation result
 */
function handleMessage(data: MessageData):
    Promise<{ success: boolean; message: string }> {
  const twilioSid = getEnvVar("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = getEnvVar("TWILIO_AUTH_TOKEN");
  const twilioPhoneNumber = getEnvVar("TWILIO_PHONE_NUMBER");
  const emailUser = getEnvVar("EMAIL_USER");
  const emailPass = getEnvVar("EMAIL_PASS");

  // Get values from request
  const {
    message,
    clientEmail,
    propertyId,
    clientId,
    realtorEmail,
    realtorPhoneNumber,
  } = data;

  // Use provided values or fall back to environment variables
  const targetEmail = realtorEmail ||
    getEnvVar("REALTOR_EMAIL", "tim.flores@flores.realty");
  const targetPhone = realtorPhoneNumber ||
    getEnvVar("REALTOR_PHONE_NUMBER", "+16085793033");

  // Create Twilio client
  const twilioClient = twilio(twilioSid, twilioAuthToken);

  if (!propertyId || !clientId || !message.trim()) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required fields: propertyId, clientId, or message"
    );
  }

  console.log(
    "Message received:",
    {
      message,
      clientEmail,
      propertyId,
      clientId,
      recipientEmail: targetEmail, // Log the actual recipient
      recipientPhone: targetPhone, // Log the actual recipient
    }
  );

  return (async () => {
    const chatDocRef = db.collection("chats").doc(propertyId);
    const chatSnapshot = await chatDocRef.get();

    if (!chatSnapshot.exists) {
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
      // Update the lastActivity timestamp
      await chatDocRef.update({
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    try {
      await db.collection("messages")
        .add({
          chatId: propertyId,
          sender: "client",
          message,
          propertyId,
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
      // Send SMS to the specific realtor's phone number
      await twilioClient.messages.create({
        body: `Property ID: ${propertyId}\nMessage: ${message}`,
        from: twilioPhoneNumber,
        to: targetPhone,
      });
      console.log("SMS sent successfully to", targetPhone);
    } catch (error) {
      console.error("Failed to send SMS:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send SMS via Twilio"
      );
    }

    // Send email to the specific realtor's email address
    const mailOptions = {
      from: emailUser,
      to: targetEmail,
      subject: `Message about Property ID: ${propertyId}`,
      text: `Message from client (${clientEmail}):\n\n${message}`,
      html: `<p><strong>Property ID:</strong> ${propertyId}</p>
            <p><strong>From:</strong> ${clientEmail}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>`,
    };

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {user: emailUser, pass: emailPass},
      });
      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully to", targetEmail);
    } catch (error) {
      console.error("Failed to send email:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send email via Nodemailer"
      );
    }

    return {success: true, message: "Message sent successfully!"};
  })();
}

/**
 * Assigns a role to a user by updating Firestore and user claims.
 * @param {UserRoleData} data User role data
 * @return {Promise<{success: boolean, message: string}>} Operation result
 */
function handleUserRole(data: UserRoleData):
    Promise<{ success: boolean; message: string }> {
  const {uid, role = "realtor"} = data;

  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "Missing UID");
  }

  return (async () => {
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
    } catch (error) {
      console.error("Failed to assign user role:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to assign user role"
      );
    }
  })();
}

/**
 * Sends a message to a realtor and updates Firestore.
 */
export const sendMessageToRealtor = functions.https.onCall((request) => {
  // Casting request.data to our interface for type safety
  return handleMessage(request.data as MessageData);
});

/**
 * Handles incoming SMS messages and updates Firestore.
 */
export const handleIncomingSms = functions.https.onRequest(
  async (req, res) => {
    const fromNumber = req.body.From;
    const messageBody = req.body.Body;
    const messageSid = req.body.MessageSid;

    console.log("Incoming SMS from:", fromNumber, "Message:", messageBody);

    // Extract property ID if the message follows format:
    // "PROP123: your message"
    let chatId: string | null = null;
    let messageContent = messageBody;

    // Check if message contains a property ID prefix
    const propertyMatch = messageBody.match(
      /^(?:PROP|Property|#)?\s*(\w+):\s*(.*)/i
    );
    if (propertyMatch) {
      chatId = propertyMatch[1];
      messageContent = propertyMatch[2];
    } else {
      // Try to find chat by realtor phone number
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
        "<Response><Message>Please specify a property ID (e.g., " +
        "'PROP123: your message')</Message></Response>"
      );
      return;
    }

    try {
      // Store the message in Firestore
      await db.collection("messages").add({
        chatId,
        sender: "realtor",
        message: messageContent,
        propertyId: chatId, // Include propertyId for context
        twilioSid: messageSid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update the chat's lastActivity timestamp
      await db.collection("chats").doc(chatId).update({
        lastActivity: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Message stored in Firestore");

      // Send a confirmation response to Twilio
      res.status(200).send(
        "<Response><Message>Message delivered to client</Message></Response>"
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
export const assignUserRole = functions.https.onCall((request) => {
  // Casting request.data to our interface for type safety
  return handleUserRole(request.data as UserRoleData);
});

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
      res
        .status(200)
        .send("Connected to Firestore. Test document created.");
    } catch (error) {
      console.error("Error writing test document:", error);
      res.status(500).send("Failed to connect to Firestore");
    }
  }
);
