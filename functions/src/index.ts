import * as admin from "firebase-admin";
import * as functions from "firebase-functions"; // Use v1 for compatibility
import nodemailer from "nodemailer";
import twilio from "twilio";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore(); // Firestore instance

/**
 * Helper function to get environment variables or Firebase secrets
 * @param {string} name - The name of the environment variable.
 * @param {string} [fallback]  value if environment variable is missing.
 * @return {string} - The value of the environment variable or fallback.
 * @throws Will throw an error if the environment variable is not found.
 */
function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value) return value;
  if (fallback) return fallback;
  throw new Error(`Environment variable ${name} is missing.`);
}

// Cloud function to send a message to the realtor
export const sendMessageToRealtor = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<{
      message: string;
      clientEmail: string;
      propertyId: string;
      clientId: string;
    }>
  ) => {
    // Access secrets or fallback to environment variables
    const twilioSid = getEnvVar("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = getEnvVar("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = getEnvVar("TWILIO_PHONE_NUMBER");
    const emailUser = getEnvVar("EMAIL_USER");
    const emailPass = getEnvVar("EMAIL_PASS");
    const realtorEmail = getEnvVar("REALTOR_EMAIL");
    const realtorPhoneNumber = getEnvVar("REALTOR_PHONE_NUMBER");

    // Initialize Twilio client
    if (!twilioSid || !twilioAuthToken) {
      throw new Error("Twilio credentials are missing.");
    }
    const twilioClient = twilio(twilioSid, twilioAuthToken);

    // Initialize Nodemailer
    if (!emailUser || !emailPass) {
      throw new Error("Email credentials are missing.");
    }
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // Extract the data from the request
    const {message, clientEmail, propertyId, clientId} = request.data;

    console.log(
      "Message received from frontend:",
      {message, clientEmail, propertyId, clientId},
      {realtorEmail, realtorPhoneNumber}
    );

    // Store the message in Firestore
    try {
      await db.collection("messages").add({
        clientId,
        message,
        from: "user",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Message stored in Firestore");
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          "Error storing message in Firestore:",
          error.message
        );
        throw new functions.https.HttpsError(
          "internal",
          `Failed to store message: ${error.message}`
        );
      } else {
        console.error("Unknown error storing message in Firestore:", error);
        throw new functions.https.HttpsError(
          "internal",
          "Failed to store message due to unknown error"
        );
      }
    }

    // Send SMS via Twilio using the realtor's phone number
    try {
      await twilioClient.messages.create({
        body: `Message regarding Property ID: ${propertyId}\n` +
              `Message: ${message}`,
        from: twilioPhoneNumber,
        to: realtorPhoneNumber,
      });
      console.log("SMS sent successfully");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Failed to send SMS:", error.message);
        throw new functions.https.HttpsError(
          "internal",
          `Failed to send SMS: ${error.message}`
        );
      } else {
        console.error("Unknown error sending SMS:", error);
        throw new functions.https.HttpsError(
          "internal",
          "Failed to send SMS due to unknown error"
        );
      }
    }

    // Send Email using Nodemailer
    const mailOptions = {
      from: emailUser,
      to: realtorEmail,
      subject: `New Message regarding Property ID: ${propertyId} ` +
               `from ${clientEmail}`,
      text: message,
    };

    try {
      console.log("Sending email to realtor...");
      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Failed to send email:", error.message);
        throw new functions.https.HttpsError(
          "internal",
          `Failed to send email: ${error.message}`
        );
      } else {
        console.error("Unknown error sending email:", error);
        throw new functions.https.HttpsError(
          "internal",
          "Failed to send email due to unknown error"
        );
      }
    }

    return {
      success: true,
      message: "Message sent successfully to realtor!",
    };
  }
);

// Function to handle incoming Twilio SMS messages
export const handleIncomingSms = functions.https.onRequest(
  async (req, res) => {
    const fromNumber = req.body.From;
    const messageBody = req.body.Body;

    console.log("Incoming message from:", fromNumber);
    console.log("Message body:", messageBody);

    let clientId: string | null = null;
    const realtorQuery = await db
      .collection("clients")
      .where("phoneNumber", "==", fromNumber)
      .limit(1)
      .get();

    if (!realtorQuery.empty) {
      clientId = realtorQuery.docs[0].id;
    }

    if (!clientId) {
      console.error("Client or Realtor not found for this number");
      res.status(400).send("Client or Realtor not found");
      return;
    }

    try {
      await db.collection("messages").add({
        clientId,
        message: messageBody,
        from: "realtor",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Message stored in Firestore");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error storing message in Firestore:", error.message);
        res.status(500).send(`Failed to store message: ${error.message}`);
      } else {
        console.error("Unknown error storing message in Firestore:", error);
        res.status(500).send("Failed to store message due to unknown error");
      }
      return;
    }

    res.writeHead(200, {"Content-Type": "text/xml"});
    res.end("Thanks for your message! We will get back to you soon.");
  }
);

// Test Firestore connection
export const testFirestoreConnection = functions.https.onRequest(
  async (req, res) => {
    try {
      const docRef = await db.collection("testCollection").add({
        testField: "Hello Firestore!",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Document written with ID:", docRef.id);
      res.status(200).send("Connected to Firestore. Document added.");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error adding document to Firestore:", error.message);
        res.status(500).send(
          `Failed to connect to Firestore: ${error.message}`
        );
      } else {
        console.error("Unknown error adding document to Firestore:", error);
        res.status(500).send(
          "Failed to connect to Firestore due to unknown error");
      }
    }
  }
);

// Cloud function to assign a user role
export const assignUserRole = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    uid: string;
    displayName: string;
    email: string;
    role: string;
  }>) => {
    const {uid, displayName, email, role} = request.data;

    if (!uid || !email || !role) {
      return {
        success: false,
        message: "Missing required fields: uid, email, or role.",
      };
    }

    try {
      await db.collection("users").doc(uid).set({
        displayName: displayName || "No Name",
        email,
        role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        message: "User role assigned successfully.",
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error saving user role:", error.message);
        return {
          success: false,
          message: `Failed to assign user role: ${error.message}`,
        };
      } else {
        console.error("Unknown error saving user role:", error);
        return {
          success: false,
          message: "Failed to assign user role due to unknown error",
        };
      }
    }
  }
);
