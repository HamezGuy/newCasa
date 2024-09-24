import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import nodemailer from "nodemailer";
import twilio from "twilio";
import MessagingResponse from "twilio/lib/twiml/MessagingResponse";

admin.initializeApp();

// Twilio credentials
const TWILIO_ACCOUNT_SID = "ACdc1190df1a7b2db6f6788f9de0d5d886";
const TWILIO_AUTH_TOKEN = "f4ca928a58c85598bfe344f859231e63";
const TWILIO_PHONE_NUMBER = "+18556213149"; // Your Twilio number

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Gmail App Password setup
const EMAIL_USER = "jamesgui111@gmail.com";
const EMAIL_PASS = "bzhl kxgk ukmw rkvd"; // Your Gmail App Password

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
export const sendMessageToRealtor =
functions.https.onCall(async (data: functions.https.CallableRequest) => {
  const {message, clientEmail, propertyId, clientId} = data.data as MessageData;

  console.log("Message received from frontend:");
  console.log(`Message: ${message}, 
    Client Email: ${clientEmail}, 
    
    Property ID: ${propertyId}, Client ID: ${clientId}`);

  // Hardcoded values for testing

  const hardcodedRealtorEmail = "jgui2@gmail.com";
  const hardcodedRealtorPhoneNumber = "+17153050360";
  // Your verified Twilio phone number

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
    subject: `New Message regarding Property ID: 
    ${propertyId} from ${clientEmail}`,
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

  return {success: true, message: "Message sent successfully to realtor!"};
});

// Function to handle incoming Twilio SMS messages
export const handleIncomingSms = functions.https.onRequest((req, res) => {
  const twiml = new MessagingResponse();

  // Log the incoming message and sender's phone number
  console.log("Incoming message from:", req.body.From);
  console.log("Message body:", req.body.Body);

  // Respond to the sender
  twiml.message("Thanks for your message! We will get back to you soon.");

  // Send the Twilio response
  res.writeHead(200, {"Content-Type": "text/xml"});
  res.end(twiml.toString());
});
