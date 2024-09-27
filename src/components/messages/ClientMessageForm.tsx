"use client"; // This marks the component as a Client Component

import { sendMessageToRealtor } from "@/app/messages/sendMessageToRealtor";
import { auth } from "@/config/firebase"; // Firebase auth
import { useState } from "react";

const ClientMessageForm = ({
  propertyId,
  realtorEmail,
  realtorPhoneNumber,
}: {
  propertyId: string;
  realtorEmail: string;       // Added props
  realtorPhoneNumber: string; // Added props
}) => {
  const [message, setMessage] = useState<string>(""); // Message state
  const [error, setError] = useState<string | null>(null); // Error state
  const [success, setSuccess] = useState<string | null>(null); // Success state

  const handleSendMessage = async () => {
    setError(null);
    setSuccess(null);

    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError("You need to be logged in to send a message.");
      return;
    }

    try {
      console.log("Sending message to realtor with the following data:", {
        propertyId,
        message,
        clientId: user.uid,
        clientEmail: user.email,
        realtorEmail,       // Pass realtorEmail
        realtorPhoneNumber, // Pass realtorPhoneNumber
      });

      await sendMessageToRealtor({
        propertyId,
        message,
        clientId: user.uid,
        clientEmail: user.email!,
        realtorEmail,       // Pass realtorEmail
        realtorPhoneNumber, // Pass realtorPhoneNumber
      });
      setSuccess("Message sent successfully!");
      setMessage(""); // Clear the message box
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message. Please try again.");
    }
  };

  return (
    <div className="message-box mt-8">
      <h3>Contact Realtor</h3>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write your message here..."
        className="w-full p-2 border rounded"
      />
      <button onClick={handleSendMessage} className="btn mt-2">
        Send Message
      </button>

      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-500">{success}</p>}
    </div>
  );
};

export default ClientMessageForm;
