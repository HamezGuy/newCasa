import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import nodemailer from "nodemailer";
import twilio from "twilio";

admin.initializeApp();

const twilioClient = twilio("ACdc1190df1a7b2db6f6788f9de0d5d886",
  "f4ca928a58c85598bfe344f859231e63");
  // TODO Use environment variables in production

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "jamesgui111@gmail.com",
    pass: "Jmesgui111",
  },
});

// Define the type for incoming data
interface MessageData {
  message: string;
  // Only keep the message since the email and phone are hardcoded
  clientEmail: string;
}

export const sendMessageToRealtor =
functions.https.onCall(async (data: functions.https.CallableRequest) => {
  const validatedData = data.data as MessageData;

  const {message, clientEmail} = validatedData;

  // Hardcoded email and phone number, testing only, remove after
  const myEmail = "jamesgui111@gmail.com"; // Replace with your actual email
  const myPhoneNumber = "+16086925376"; // Replace with your actual phone number

  // Send SMS
  try {
    await twilioClient.messages.create({
      body: message,
      from: "+18556213149",
      to: myPhoneNumber,
    });
  } catch (error) {
    console.error("Failed to send SMS:", error);
  }

  // Send Email
  const mailOptions = {
    from: "jamesgui111@gmail.com",
    to: myEmail,
    subject: `New Message from ${clientEmail}`,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send email:", error);
  }

  return {success: true};
});
