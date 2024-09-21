import { functions } from "@/config/firebase";
import { httpsCallable } from "firebase/functions";

export async function sendMessageToRealtor({
  propertyId,
  realtorEmail,
  message,
  clientId,
  clientEmail,
}: {
  propertyId: string;
  realtorEmail: string;
  message: string;
  clientId: string;
  clientEmail: string;
}) {
  const sendMessage = httpsCallable(functions, "sendMessageToRealtor");
  return sendMessage({
    propertyId,
    realtorEmail,
    message,
    clientId,
    clientEmail,
  });
}
