"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation"; // Import useRouter
import { useEffect, useState } from "react";
import { auth, db } from "../../config/firebase"; // Adjust path as needed

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter(); // Initialize router

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch the user's role from Firestore
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data()?.role || "No role assigned");
        }
      } else {
        router.push("/login"); // Redirect to login if not authenticated
      }
    });

    return () => unsubscribe();
  }, [router]); // Add router to dependency array

  if (!user) {
    return <div>Loading...</div>; // Fallback in case loading is slow
  }

  return (
    <div className="container mx-auto mt-10">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p><strong>Name:</strong> {user.displayName || "No Name"}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Role:</strong> {role}</p> {/* Display user role */}
    </div>
  );
}
