import { doc, getDoc } from "firebase/firestore"; // Import Firestore functions
import { db } from "../firebase"; // Adjust this path based on your project structure

export const getUserRole = async (uid: string): Promise<string> => {
  const retryLimit = 3; // Maximum number of retries
  let retryCount = 0;
  let userDoc;

  while (retryCount < retryLimit) {
    try {
      userDoc = await getDoc(doc(db, "users", uid));

      if (userDoc.exists()) {
        const role = userDoc.data()?.role || "user";
        console.log(`User role retrieved: ${role}`);
        return role;
      } else {
        console.warn(`User document for UID ${uid} does not exist. Retrying...`);
      }

      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error fetching user role for UID ${uid}:`, error);
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.error(`Failed to retrieve user role for UID ${uid} after ${retryLimit} attempts.`);
  return "user"; // Default to "user" if the document is still not found after retries
};
