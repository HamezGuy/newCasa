"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "../../config/firebase";

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>("user"); // Default role to 'user'
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Fetch the user's role from Firestore
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data()?.role || "No role assigned");
          } else {
            setRole("No role assigned");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setError("Failed to fetch role. The client might be offline.");
        } finally {
          setLoading(false); // End loading after fetching data
        }
      } else {
        router.push("/login"); // Redirect to login if not authenticated
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Show a loading state while fetching the user data
  if (loading) {
    return <div>Loading...</div>;
  }

  // Show error message if fetching the user role fails
  if (error) {
    return <div className="text-red-500">{error}</div>;
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
