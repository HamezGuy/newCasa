// @/components/messaging/MessageInput.tsx
import { sendMessageToRealtor } from "@/lib/utils/sendMessageToRealtor";
import { useState } from "react";
import { auth } from "@/lib/firebase";

interface MessageInputProps {
  propertyId: string; // The ID of the property or chat
  clientId: string; // The current user ID
  clientEmail?: string; // Optional client email
}

export default function MessageInput({ 
  propertyId, 
  clientId, 
  clientEmail = "user@example.com" 
}: MessageInputProps) {
  const [message, setMessage] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSendMessage = async () => {
    if (message.trim() === "") return;
    
    setIsSending(true);
    setError(null);
    setSuccess(false);

    try {
      // Use authenticated email if available
      const finalClientEmail = auth.currentUser?.email || clientEmail;
      const finalClientId = auth.currentUser?.uid || clientId;
      
      // Send the message using our utility function
      // This handles both Firestore operations and API calls
      await sendMessageToRealtor({
        propertyId,
        message,
        clientId: finalClientId,
        clientEmail: finalClientEmail,
      });
      
      setMessage(""); // Clear input after sending
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error("Failed to send message:", error);
      setError(error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="message-input">
      {error && (
        <div className="mb-2 p-2 text-sm bg-red-100 text-red-700 rounded flex justify-between">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900"
          >
            ✕
          </button>
        </div>
      )}
      
      {success && (
        <div className="mb-2 p-2 text-sm bg-green-100 text-green-700 rounded">
          Message sent successfully!
        </div>
      )}
      
      <div className="flex flex-col space-y-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="w-full p-2 border rounded"
          disabled={isSending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <button 
          onClick={handleSendMessage} 
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          disabled={!message.trim() || isSending}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}