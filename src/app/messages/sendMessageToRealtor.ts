import { functions } from "@/config/firebase";
import { httpsCallable } from "firebase/functions";

// Define the same type for consistency
interface MessageData {
  propertyId: string;
  realtorEmail: string;
  realtorPhoneNumber: string;
  message: string;
  clientId: string;
  clientEmail: string;
}

export async function sendMessageToRealtor({
  propertyId,
  realtorEmail,
  realtorPhoneNumber,
  message,
  clientId,
  clientEmail,
}: MessageData) {
  const sendMessage = httpsCallable(functions, "sendMessageToRealtor");
  return sendMessage({
    propertyId,
    realtorEmail,
    realtorPhoneNumber,
    message,
    clientId,
    clientEmail,
  });
}
