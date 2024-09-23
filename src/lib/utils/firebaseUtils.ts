import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebase"; // Ensure this is the correct path to your Firebase config

/**
 * Get the user role from Firestore using the user's UID.
 * @param uid - The Firebase user ID
 * @returns The role of the user (e.g., 'realtor' or 'user')
 */
export const getUserRole = async (uid: string): Promise<string> => {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data()?.role || "user";
  }
  return "user"; 
};
