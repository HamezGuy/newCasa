import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import nodemailer from "nodemailer";
import twilio from "twilio";
import {config} from "./config"; // Correctly importing the config

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore(); // Firestore instance

// Initialize Twilio client using config
const twilioClient = twilio(
  config.twilio.accountSid,
  config.twilio.authToken
);

// Initialize Nodemailer using Gmail credentials from config
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

// Define the type for incoming data
interface MessageData {
  message: string;
  clientEmail: string;
  propertyId: string;
  clientId: string;
  realtorEmail: string; // Add realtorEmail
  realtorPhoneNumber: string; // Add realtorPhoneNumber
}

// Cloud function to send a message to the realtor
export const sendMessageToRealtor = functions.https.onCall(
  async (data) => {
    const {
      message,
      clientEmail,
      propertyId,
      clientId,
      realtorEmail, // Handle these fields
      realtorPhoneNumber, // Handle these fields
    } = data.data as MessageData;

    console.log("Message received from frontend:", {
      message,
      clientEmail,
      propertyId,
      clientId,
      realtorEmail,
      realtorPhoneNumber,
    });

    // Store the message in Firestore
    try {
      await db.collection("messages").add({
        clientId,
        message,
        from: "user",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Message stored in Firestore");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error storing message in Firestore:", error.message);
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

    // Send SMS via Twilio using realtorPhoneNumber
    try {
      await twilioClient.messages.create({
        body: `Message regarding Property ID: 
        ${propertyId}\nMessage: ${message}`,
        from: config.twilio.phoneNumber,
        to: realtorPhoneNumber, // Use the realtor's phone number
      });
      console.log("SMS sent successfully");
    } catch (error: unknown) {
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

    // Send Email using realtorEmail
    const mailOptions = {
      from: config.email.user,
      to: realtorEmail, // Use the realtor's email
      subject: `New Message regarding Property ID: 
        ${propertyId} from ${clientEmail}`,
      text: message,
    };

    try {
      console.log("Sending email to realtor...");
      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully");
    } catch (error: unknown) {
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
    const twiml = new twilio.twiml.MessagingResponse();
    const fromNumber = req.body.From;
    const messageBody = req.body.Body;

    console.log("Incoming message from:", fromNumber);
    console.log("Message body:", messageBody);

    // Look up the clientId based on the realtor's phone number
    let clientId: string | null = null;
    const realtorQuery = await db
      .collection("clients")
      .where("phoneNumber", "==", fromNumber) // Match realtor's phone number
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

    // Store the incoming message in Firestore under the user's messages
    try {
      await db.collection("messages").add({
        clientId, // Add the client ID
        message: messageBody,
        from: "realtor", // Message is from the realtor
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Message stored in Firestore");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error storing message in Firestore:", error.message);
        res.status(500).send(`Failed to store message: ${error.message}`);
      } else {
        console.error("Unknown error storing message in Firestore:", error);
        res.status(500).send("Failed to store message due to unknown error");
      }
      return;
    }

    // Respond to the sender via Twilio
    twiml.message("Thanks for your message! We will get back to you soon.");
    res.writeHead(200, {"Content-Type": "text/xml"});
    res.end(twiml.toString());
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
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(
          "Error adding document to Firestore:", error.message);
        res.status(500).send(
          `Failed to connect to Firestore: ${error.message}`);
      } else {
        console.error(
          "Unknown error adding document to Firestore:", error);
        res.status(500).send(
          "Failed to connect to Firestore due to unknown error");
      }
    }
  }
);

// New Cloud Function: Assign User Role
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
      // Save user data to Firestore
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
      console.error("Error saving user role:", error);
      return {
        success: false,
        message: "Failed to assign user role.",
      };
    }
  }
);
