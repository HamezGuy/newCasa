import { db } from "@/config/firebase"; // If the config folder is inside src
import { doc, getDoc } from "firebase/firestore";

export const getUserRole = async (uid: string): Promise<string> => {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    return userDoc.data()?.role || "user";
  }
  return "user";
};
