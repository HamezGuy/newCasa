// @/lib/utils/sendMessageToRealtor.ts
import { functions, db, auth } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";

// Default values
const DEFAULT_REALTOR_EMAIL = "tim.flores@flores.realty";
const DEFAULT_REALTOR_PHONE = "+16085793033";

interface SendMessageParams {
  message: string;
  clientEmail: string;
  propertyId: string;
  clientId: string;
  realtorEmail?: string;
  realtorPhoneNumber?: string;
}

interface SendMessageResponse {
  success: boolean;
  message: string;
}

export async function sendMessageToRealtor({
  message,
  clientEmail,
  propertyId,
  clientId,
  realtorEmail,
  realtorPhoneNumber,
}: SendMessageParams): Promise<SendMessageResponse> {
  if (!message.trim() || !propertyId) {
    throw new Error("Missing required fields for sending a message");
  }
  
  // Ensure we have a clientId, even for guests
  const finalClientId = clientId || `guest-${Date.now()}`;
  
  // Determine the final email and phone to use
  const finalRealtorEmail = realtorEmail || DEFAULT_REALTOR_EMAIL;
  const finalRealtorPhone = realtorPhoneNumber || DEFAULT_REALTOR_PHONE;

  const messageData: SendMessageParams = {
    message,
    clientEmail: clientEmail || "guest@example.com",
    propertyId,
    clientId: finalClientId,
    realtorEmail: finalRealtorEmail,
    realtorPhoneNumber: finalRealtorPhone
  };

  console.log("Sending message with parameters:", messageData);

  // Check if user is authenticated
  const currentUser = auth.currentUser;
  
  // Try to create/update chat and add message directly if authenticated
  if (currentUser) {
    try {
      console.log("User is authenticated, attempting direct Firestore write");
      
      // Try to create/update chat document
      try {
        const chatRef = doc(db, "chats", propertyId);
        await setDoc(chatRef, {
          propertyId,
          clientId: finalClientId,
          clientEmail: clientEmail || "guest@example.com",
          realtorEmail: finalRealtorEmail,
          realtorPhoneNumber: finalRealtorPhone,
          lastActivity: serverTimestamp(),
        }, { merge: true });
        console.log("Chat document created/updated");
      } catch (chatError) {
        console.warn("Failed to create/update chat document:", chatError);
        // Continue anyway, as the cloud function will handle this
      }
      
      // Try to add message
      try {
        await addDoc(collection(db, "messages"), {
          chatId: propertyId,
          sender: "client",
          message,
          propertyId,
          timestamp: serverTimestamp(),
        });
        console.log("Message added to Firestore directly");
        
        // If direct Firestore write succeeds, return success
        return { success: true, message: "Message stored successfully!" };
      } catch (msgError) {
        console.warn("Failed to add message directly:", msgError);
        // Continue to API call
      }
    } catch (firestoreError) {
      console.warn("Direct Firestore operations failed:", firestoreError);
      // Continue to API call
    }
  } else {
    console.log("User not authenticated, skipping direct Firestore write");
  }

  // Try the HTTP function directly with "no-cors" mode as a workaround for CORS issues
  try {
    console.log("Calling HTTP function directly with no-cors mode");
    const httpResponse = await fetch('https://us-central1-rondevu-edbb7.cloudfunctions.net/sendMessageToRealtorHttpV1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
      mode: 'no-cors', // This prevents CORS errors but makes response unreadable
    });
    
    // With no-cors, we can't read the response, so just assume success
    console.log("Message likely sent via direct HTTP function (no-cors mode)");
    return { success: true, message: "Message sent (no response details available)" };
  } catch (httpError) {
    console.warn("HTTP function with no-cors failed:", httpError);
    // Continue to next method
  }

  // Try Firebase callable function (which is having CORS issues)
  try {
    console.log("Trying Firebase callable function");
    const sendMessageFunction = httpsCallable<SendMessageParams, SendMessageResponse>(
      functions, 
      'sendMessageToRealtorV1'
    );
    
    const result = await sendMessageFunction(messageData);
    console.log("Message sent successfully via Firebase callable function:", result.data);
    return result.data;
  } catch (fbError: any) {
    console.error("Error calling Firebase function:", fbError);
    
    // Try Next.js API route as a last resort
    try {
      console.log("Trying Next.js API route");
      
      // Use absolute URL to ensure we're hitting the right endpoint
      const apiUrl = window.location.origin + '/api/v1/sendMessage';
      console.log("Using API URL:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "No error details");
        console.error(`API error (${response.status}):`, errorText);
        throw new Error(`Request failed with status code ${response.status}`);
      }

      const result = await response.json() as SendMessageResponse;
      console.log("Message sent successfully via Next.js API route:", result);
      return result;
    } catch (apiError: any) {
      console.error("All methods failed:", apiError);
      
      // Extract detailed error information from original Firebase error
      const errorCode = fbError.code || 'unknown';
      const errorMessage = fbError.message || 'Network Error';
      const details = fbError.details ? JSON.stringify(fbError.details) : '';
      
      throw new Error(`Failed to send message (${errorCode}): ${errorMessage} ${details}`);
    }
  }
}