import { functions } from "@/config/firebase";
import { httpsCallable } from "firebase/functions";

// Define the same type for consistency
interface MessageData {
  propertyId: string;
  message: string;
  clientId: string;
  clientEmail: string;
}

export async function sendMessageToRealtor({
  propertyId,
  message,
  clientId,
  clientEmail,
}: MessageData) {
  const sendMessage = httpsCallable(functions, "sendMessageToRealtor");

  console.log("Sending message data to Firebase function:", {
    propertyId,
    message,
    clientId,
    clientEmail,
  });

  return sendMessage({
    propertyId,
    message,
    clientId,
    clientEmail,
  });
}
