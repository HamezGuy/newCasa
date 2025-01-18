"use client";

import { useState } from "react";

interface ClientMessageFormProps {
  propertyId: string;
  realtorEmail: string;
  realtorPhoneNumber: string;
}

/**
 * This is a simple "Zillow-like" message form.
 * Adjust Tailwind classes as you wish for spacing/colors.
 */
export default function ClientMessageForm({
  propertyId,
  realtorEmail,
  realtorPhoneNumber,
}: ClientMessageFormProps) {
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Example "sendMessage" logic (fake)
  const handleSendMessage = async () => {
    if (!message.trim()) {
      setError("Please type a message before sending.");
      return;
    }
    setIsSending(true);
    setError(null);
    setSuccess(false);

    try {
      // Example: you could call /api/sendMessage or similar
      // This is just a placeholder
      await fakeApiCall({
        propertyId,
        realtorEmail,
        realtorPhoneNumber,
        userName,
        userPhone,
        message,
      });

      setSuccess(true);
      setMessage("");
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError("Sorry, there was an error sending your message.");
    } finally {
      setIsSending(false);
    }
  };

  // Just a mock "API call"
  async function fakeApiCall(payload: any) {
    return new Promise((resolve) => {
      console.log("Fake sending message =>", payload);
      setTimeout(() => {
        resolve("ok");
      }, 1000);
    });
  }

  return (
    <div className="max-w-lg bg-white p-4 rounded shadow-sm border border-gray-200">
      {/* Title/Intro */}
      <h3 className="text-lg font-semibold mb-2">Contact the Realtor</h3>

      <p className="text-sm text-gray-500 mb-4">
        We can get you more info about the property, or schedule a showing.
      </p>

      {/* If success, show a "Thank you" */}
      {success && (
        <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">
          Message sent! The realtor will be in touch shortly.
        </div>
      )}

      {/* If error, show an error box */}
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Name / Phone (optional) */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700">
          Your Name (optional)
        </label>
        <input
          type="text"
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          placeholder="John Doe"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
      </div>

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

      {/* Message textarea */}
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

      {/* Submit button */}
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
