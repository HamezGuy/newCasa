import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import nodemailer from "nodemailer";
import twilio from "twilio";

admin.initializeApp();

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!,
  },
});

// Define the type for incoming data
interface MessageData {
  realtorEmail: string;
  realtorPhoneNumber: string;
  message: string;
  clientEmail: string;
  clientPhoneNumber: string; // Add this if you want to send back to the user
}

// Update the function signature
export const sendMessageToRealtor = functions.https.onCall(async (data: functions.https.CallableRequest) => {
  const validatedData = data.data as MessageData; // Type assertion

  const { realtorEmail, realtorPhoneNumber, message, clientEmail, clientPhoneNumber } = validatedData;

  // Send SMS to realtor
  try {
    await twilioClient.messages.create({
      body: message,
      from: "YOUR_TWILIO_PHONE_NUMBER",
      to: realtorPhoneNumber,
    });
  } catch (error) {
    console.error("Failed to send SMS:", error);
  }

  // Send Email to realtor
  const mailOptions = {
    from: "YOUR_EMAIL@gmail.com",
    to: realtorEmail,
    subject: `New Message from ${clientEmail}`,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send email:", error);
  }

  // Optionally send a confirmation message back to the client
  try {
    await transporter.sendMail({
      from: "YOUR_EMAIL@gmail.com",
      to: clientEmail,
      subject: "Your message was sent!",
      text: `Your message to the realtor has been sent successfully: "${message}"`,
    });

    await twilioClient.messages.create({
      body: `Your message has been sent: "${message}"`,
      from: "YOUR_TWILIO_PHONE_NUMBER",
      to: clientPhoneNumber, // Send back to user's phone number
    });
  } catch (error) {
    console.error("Failed to send confirmation to client:", error);
  }

  return { success: true };
});
