import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  sender: string;
  message: string;
  timestamp: any;
  propertyId?: string;
}

interface ChatDetailProps {
  chatId: string | null;
  clientId: string;
  propertyTitle?: string;
}

const ChatDetail: React.FC<ChatDetailProps> = ({ chatId, clientId, propertyTitle }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the newest message
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!chatId) return;

    setIsLoading(true);
    const messagesQuery = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(messagesData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId) return;

    try {
      await addDoc(collection(db, "messages"), {
        chatId,
        sender: "client",
        message: newMessage,
        propertyId: chatId, // Storing propertyId with each message
        timestamp: serverTimestamp(),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!chatId) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Select a chat to view messages.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[70vh] border rounded-lg">
      {/* Chat header */}
      <div className="bg-gray-100 p-4 border-b">
        <h3 className="font-medium">
          {propertyTitle ? propertyTitle : `Property #${chatId}`}
        </h3>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <p className="text-center text-gray-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[75%] p-3 rounded-lg ${
                msg.sender === "client"
                  ? "ml-auto bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-100 rounded-bl-none"
              }`}
            >
              <p>{msg.message}</p>
              <div className={`text-xs mt-1 ${
                msg.sender === "client" ? "text-blue-100" : "text-gray-500"
              }`}>
                {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleString() : "Sending..."}
              </div>
            </div>
          ))
        )}
        <div ref={messageEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-3">
        <div className="flex">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message"
            className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="bg-blue-500 text-white px-4 rounded-r hover:bg-blue-600 disabled:bg-gray-300"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatDetail;