import { sendMessageToRealtor } from "@/lib/utils/sendMessageToRealtor";
import { useState } from "react";

interface MessageInputProps {
  propertyId: string; // The ID of the property or chat
  clientId: string; // The current user ID
}

export default function MessageInput({ propertyId, clientId }: MessageInputProps) {
  const [message, setMessage] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async () => {
    if (message.trim() === "") return;
    
    setIsSending(true);
    setError(null);

    try {
      await sendMessageToRealtor({
        propertyId,
        message,
        clientId,
        clientEmail: "user@example.com", // Replace with actual email logic
        // The utility will use default values if these are not provided
      });
      setMessage(""); // Clear input after sending
      setIsSending(false);
    } catch (error: any) {
      console.error("Failed to send message:", error);
      setError(error.message);
      setIsSending(false);
    }
  };

  return (
    <div className="message-input">
      {error && (
        <div className="mb-2 p-2 text-sm bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="w-full p-2 border rounded"
        disabled={isSending}
      />
      <button 
        onClick={handleSendMessage} 
        className="bg-blue-500 text-white p-2 rounded"
        disabled={!message.trim() || isSending}
      >
        {isSending ? "Sending..." : "Send"}
      </button>
    </div>
  );
}