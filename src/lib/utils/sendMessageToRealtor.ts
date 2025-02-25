import { db } from "@/lib/firebase";
import { 
  addDoc, 
  collection, 
  doc, 
  getDoc, 
  serverTimestamp, 
  setDoc, 
  updateDoc 
} from "firebase/firestore";
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
    // First, check if a chat for this property and client exists
    const chatDocRef = doc(db, "chats", propertyId);
    const chatDoc = await getDoc(chatDocRef);

    // If no chat exists, create one
    if (!chatDoc.exists()) {
      await setDoc(chatDocRef, {
        propertyId,
        clientId,
        clientEmail,
        realtorEmail: finalRealtorEmail,
        realtorPhoneNumber: finalRealtorPhone,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
      });
    } else {
      // Update the lastActivity timestamp
      await updateDoc(chatDocRef, {
        lastActivity: serverTimestamp()
      });
    }

    // Add the message to Firestore
    await addDoc(collection(db, "messages"), {
      chatId: propertyId,
      sender: "client",
      message,
      propertyId, // Include property ID with the message for context
      timestamp: serverTimestamp(),
    });

    // Call the cloud function to send SMS via Twilio
    // UPDATED: Now explicitly passing realtor contact info to the cloud function
    const functions = getFunctions();
    const sendMessageFunction = httpsCallable(functions, 'sendMessageToRealtor');
    
    await sendMessageFunction({
      message,
      clientEmail,
      propertyId,
      clientId,
      realtorEmail: finalRealtorEmail,
      realtorPhoneNumber: finalRealtorPhone
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error in sendMessageToRealtor:", error);
    throw new Error(`Failed to send message: ${error.message}`);
  }
}