"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase"; // Adjust this path based on your project structure
import { getUserRole } from "../../lib/utils/firebaseUtils"; // Import getUserRole from utils

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null); // No default role, wait for fetch
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Fetch the user role from Firestore
          const userRole = await getUserRole(currentUser.uid);
          setRole(userRole);
        } catch (error) {
          console.error("Error fetching user role:", error);
          setError("Failed to fetch role. Please check your connection or try again.");
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
    return (
      <div className="text-red-500">
        {error}
        <button onClick={() => window.location.reload()} className="text-blue-500 underline ml-2">
          Retry
        </button>
      </div>
    );
  }

  // If user or role is still null (which shouldn't happen), show a fallback
  if (!user || !role) {
    return <div>Error: User information is missing.</div>;
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
