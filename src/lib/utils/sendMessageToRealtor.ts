import { getFunctions, httpsCallable } from "firebase/functions";

// Default values from your next.config.mjs publicRuntimeConfig
const DEFAULT_REALTOR_EMAIL = "tim.flores@flores.realty";
const DEFAULT_REALTOR_PHONE = "+16085793033"; // Use the real phone number from your config

interface SendMessageParams {
  message: string;
  clientEmail: string;
  propertyId: string;
  clientId: string;
  realtorEmail?: string;
  realtorPhoneNumber?: string;
}

export async function sendMessageToRealtor({
  message,
  clientEmail,
  propertyId,
  clientId,
  realtorEmail,
  realtorPhoneNumber,
}: SendMessageParams) {
  if (!message.trim() || !propertyId || !clientId) {
    throw new Error("Missing required fields for sending a message");
  }
  
  // Determine the final email and phone to use
  const finalRealtorEmail = realtorEmail || DEFAULT_REALTOR_EMAIL;
  const finalRealtorPhone = realtorPhoneNumber || DEFAULT_REALTOR_PHONE;

  try {
    // Call the cloud function to handle everything
    const functions = getFunctions();
    const sendMessageFunction = httpsCallable(functions, 'sendMessageToRealtor');
    
    const result = await sendMessageFunction({
      message,
      clientEmail,
      propertyId,
      clientId,
      realtorEmail: finalRealtorEmail,
      realtorPhoneNumber: finalRealtorPhone
    });

    return { success: true, message: "Message sent successfully!" };
  } catch (error: any) {
    console.error("Error in sendMessageToRealtor:", error);
    throw new Error(`Failed to send message: ${error.message}`);
  }
}