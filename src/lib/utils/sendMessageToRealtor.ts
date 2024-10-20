import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";

// Define the same type for consistency
export interface MessageData {
  propertyId: string;
  message: string;
  clientId: string;
  clientEmail: string;
  realtorEmail: string;       // Add realtorEmail
  realtorPhoneNumber: string; // Add realtorPhoneNumber
}

export async function sendMessageToRealtor({
  propertyId,
  message,
  clientId,
  clientEmail,
  realtorEmail,
  realtorPhoneNumber,
}: MessageData): Promise<any> {
  const sendMessage = httpsCallable(functions, "sendMessageToRealtor");

  console.log("Sending message data to Firebase function:", {
    propertyId,
    message,
    clientId,
    clientEmail,
    realtorEmail,       // Include realtorEmail
    realtorPhoneNumber, // Include realtorPhoneNumber
  });

  try {
    const response = await sendMessage({
      propertyId,
      message,
      clientId,
      clientEmail,
      realtorEmail,       // Send realtorEmail
      realtorPhoneNumber, // Send realtorPhoneNumber
    });
    return response;
  } catch (error) {
    console.error("Error sending message to realtor:", error);
    throw new Error("Failed to send message to realtor.");
  }
}
