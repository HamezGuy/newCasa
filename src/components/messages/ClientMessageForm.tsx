"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { sendMessageToRealtor } from "@/lib/utils/sendMessageToRealtor";

interface ClientMessageFormProps {
  propertyId: string;
  realtorEmail: string;
  realtorPhoneNumber: string;
}

export default function ClientMessageForm({
  propertyId,
  realtorEmail,
  realtorPhoneNumber,
}: ClientMessageFormProps) {
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setUserName(currentUser.displayName || "");
        setUserEmail(currentUser.email || "");
      }
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      setError("Please type a message before sending.");
      return;
    }
    
    if (!user && !userEmail) {
      setError("Please provide your email address to continue.");
      return;
    }
    
    setIsSending(true);
    setError(null);
    setSuccess(false);

    try {
      // Get user ID or generate a temporary one for non-logged in users
      const clientId = user?.uid || `guest-${Date.now()}`;
      const clientEmail = userEmail || user?.email || "anonymous@example.com";

      // UPDATED: Pass the realtor contact info explicitly
      await sendMessageToRealtor({
        message, 
        clientEmail,
        propertyId,
        clientId,
        realtorEmail,       // Explicitly pass the realtor's email
        realtorPhoneNumber, // Explicitly pass the realtor's phone
      });

      setSuccess(true);
      setMessage("");
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError("Sorry, there was an error sending your message: " + (err.message || "Unknown error"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-lg bg-white p-4 rounded shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-2">Contact the Realtor</h3>

      <p className="text-sm text-gray-500 mb-4">
        We can get you more info about property #{propertyId}, or schedule a showing.
      </p>

      {success && (
        <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">
          Message sent! The realtor will be in touch shortly. Visit your Messages page to continue the conversation.
        </div>
      )}

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700">
          Your Name {!user && "(optional)"}
        </label>
        <input
          type="text"
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          placeholder="John Doe"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          disabled={!!user?.displayName}
        />
      </div>

      {!user && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Your Email
          </label>
          <input
            type="email"
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            placeholder="your@email.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            required
          />
        </div>
      )}

      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700">
          Your Phone Number (optional)
        </label>
        <input
          type="tel"
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          placeholder="(555) 123-4567"
          value={userPhone}
          onChange={(e) => setUserPhone(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700">
          Message
        </label>
        <textarea
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          rows={4}
          placeholder="Hi, I'd like more info about this listing. Please contact me at..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      <button
        onClick={handleSendMessage}
        disabled={isSending}
        className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        {isSending ? "Sending..." : "Send Message"}
      </button>
    </div>
  );
}