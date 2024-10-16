import * as functions from 'firebase-functions';
import MessagingResponse from 'twilio/lib/twiml/MessagingResponse';

// Function to handle incoming Twilio SMS messages
export const handleIncomingSms = functions.https.onRequest((req, res) => {
  const twiml = new MessagingResponse();

  // Log the incoming message and sender's phone number
  console.log('Incoming message from:', req.body.From);
  console.log('Message body:', req.body.Body);

  // Respond to the sender
  twiml.message('Thanks for your message! We will get back to you soon.');

  // Send the Twilio response
  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});
