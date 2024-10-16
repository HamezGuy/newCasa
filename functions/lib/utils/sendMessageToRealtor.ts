import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import nodemailer from "nodemailer";
import twilio from "twilio";

admin.initializeApp();

// Initialize environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!;
const EMAIL_USER = process.env.EMAIL_USER!;
const EMAIL_PASS = process.env.EMAIL_PASS!;

// Initialize Twilio client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Initialize Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Define the type for incoming data
interface MessageData {
  message: string;
  clientEmail: string;
  propertyId: string;
  clientId: string;
}

// Cloud function to send a message to the realtor
export const sendMessageToRealtor = functions.https.onCall(async (data: functions.https.CallableRequest) => {
  const { message, clientEmail, propertyId, clientId } = data.data as MessageData;

  console.log("Message received from frontend:");
  console.log(`Message: ${message}, Client Email: ${clientEmail}, Property ID: ${propertyId}, Client ID: ${clientId}`);

  // Realtor information from environment variables
  const hardcodedRealtorEmail = process.env.REALTOR_EMAIL!;
  const hardcodedRealtorPhoneNumber = process.env.REALTOR_PHONE_NUMBER!;

  // Send SMS
  try {
    console.log("Sending SMS to realtor...");
    await twilioClient.messages.create({
      body: `Message regarding Property ID: ${propertyId}\nMessage: ${message}`,
      from: TWILIO_PHONE_NUMBER,
      to: hardcodedRealtorPhoneNumber, // Verified Twilio number
    });
    console.log("SMS sent successfully");
  } catch (error) {
    console.error("Failed to send SMS:", error);
    throw new functions.https.HttpsError("internal", "Failed to send SMS");
  }

  // Send Email
  const mailOptions = {
    from: EMAIL_USER,
    to: hardcodedRealtorEmail,
    subject: `New Message regarding Property ID: ${propertyId} from ${clientEmail}`,
    text: message,
  };

  try {
    console.log("Sending email to realtor...");
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new functions.https.HttpsError("internal", "Failed to send email");
  }

  return { success: true, message: "Message sent successfully to realtor!" };
});
