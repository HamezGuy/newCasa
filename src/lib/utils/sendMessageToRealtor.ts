// We are not importing Firestore here because we rely on the Cloud Function to do any Firestore writes.
// import { db, collection, addDoc, ... } from "@/lib/firebase";

/**
 * Tim's details are hard-coded so all messages go to Tim's phone and email.
 */
const FIXED_REALTOR_EMAIL = "tim.flores@flores.realty"; //tim.flores@flores.realty
const FIXED_REALTOR_PHONE = "+16085793033"; //+16085793033

interface SendMessageParams {
  message: string;
  clientEmail: string;
  propertyId: string;
  clientId: string;
  realtorEmail?: string;
  realtorPhoneNumber?: string;

  // NEW FIELDS:
  clientName?: string;
  clientPhone?: string;
  propertyLink?: string;
}

interface SendMessageResponse {
  success: boolean;
  message: string;
}

/**
 * Sends message data to the Cloud Function, forcing Tim's contact info.
 */
export async function sendMessageToRealtor({
  message,
  clientEmail,
  propertyId,
  clientId,
  realtorEmail,
  realtorPhoneNumber,

  // NEW FIELDS
  clientName,
  clientPhone,
  propertyLink,
}: SendMessageParams): Promise<SendMessageResponse> {
  // Validate input
  if (!message.trim() || !propertyId) {
    throw new Error("Missing required fields for sending a message");
  }

  // If there's no logged-in user, assign a guest- prefixed clientId
  const finalClientId = clientId || `guest-${Date.now()}`;

  // Even if the front end passes in other realtor info, we override it with Tim's constants
  const messageData = {
    message,
    clientEmail: clientEmail || "guest@example.com",
    propertyId,
    clientId: finalClientId,
    realtorEmail: FIXED_REALTOR_EMAIL,      // Always Tim's email
    realtorPhoneNumber: FIXED_REALTOR_PHONE, // Always Tim's phone

    // Pass along the new fields if provided
    clientName,
    clientPhone,
    propertyLink,
  };

  console.log("Sending message with parameters:", messageData);

  let notificationSuccess = false;
  try {
    console.log("Triggering notifications via Firebase function (newcasa-feecb)");

    // IMPORTANT: Use "cors" (or omit 'mode') so the JSON body is properly sent
    await fetch(
      "https://us-central1-newcasa-feecb.cloudfunctions.net/sendMessageToRealtorHttpV1",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
        mode: "cors", // Ensures the Cloud Function receives a valid POST with JSON
      }
    );

    console.log("Notification request sent successfully");
    notificationSuccess = true;
  } catch (fetchError) {
    console.warn("HTTP notification failed:", fetchError);
    // We have no fallback method here, so just log the error.
    console.warn("No alternative fallback is configured.");
  }

  if (notificationSuccess) {
    return {
      success: true,
      message:
        "Message request sent successfully. Tim Flores will be in touch shortly.",
    };
  } else {
    throw new Error(
      "Unable to send message. Please try again later or use the email option."
    );
  }
}
