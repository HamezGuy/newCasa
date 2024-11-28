import { sendMessageToRealtor } from "@/lib/utils/sendMessageToRealtor";
import { useState } from "react";

interface MessageInputProps {
  propertyId: string; // The ID of the property or chat
  clientId: string; // The current user ID
}

export default function MessageInput({ propertyId, clientId }: MessageInputProps) {
  const [message, setMessage] = useState<string>("");

  const handleSendMessage = async () => {
    if (message.trim() === "") return;

    try {
      await sendMessageToRealtor({
        propertyId,
        message,
        clientId,
        clientEmail: "user@example.com", // Replace with actual email logic
        realtorEmail: "realtor@example.com", // Replace with actual logic
        realtorPhoneNumber: "+1234567890", // Replace with actual phone logic
      });
      setMessage(""); // Clear input after sending
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="message-input">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="w-full p-2 border rounded"
      />
      <button onClick={handleSendMessage} className="bg-blue-500 text-white p-2 rounded">
        Send
      </button>
    </div>
  );
}
