import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import nodemailer from "nodemailer";
import twilio from "twilio";

admin.initializeApp();

// Hardcoded Twilio credentials
const TWILIO_ACCOUNT_SID = "ACdc1190df1a7b2db6f6788f9de0d5d886";
const TWILIO_AUTH_TOKEN = "f4ca928a58c85598bfe344f859231e63";
const TWILIO_PHONE_NUMBER = "+18556213149"; // Your Twilio number

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Hardcoded email credentials
const EMAIL_USER = "jamesgui111@gmail.com";
const EMAIL_PASS = "Jmesgui111"; // Your email password

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Define the type for incoming data
interface MessageData {
  message: string; // Only keep the message for input
  clientEmail: string;
}

export const sendMessageToRealtor = functions.https.onCall(async (data: functions.https.CallableRequest) => {
  const validatedData = data.data as MessageData;

  const { message, clientEmail } = validatedData;

  // Hardcoded values for recipient
  const hardcodedRealtorEmail = "jamesgui111@gmail.com"; // Replace with your email
  const hardcodedRealtorPhoneNumber = "+17153050360"; // Replace with your phone number

  // Send SMS to hardcoded phone number
  try {
    await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: hardcodedRealtorPhoneNumber,
    });
  } catch (error) {
    console.error("Failed to send SMS:", error);
  }

  // Send Email to hardcoded email address
  const mailOptions = {
    from: EMAIL_USER,
    to: hardcodedRealtorEmail,
    subject: `New Message from ${clientEmail}`,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send email:", error);
  }

  return { success: true };
});
