// src/components/messages/ChatDetail.tsx
import { Message } from "@/app/types/Messages";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";

interface ChatDetailProps {
  chatId: string | null; 
  clientId: string; // To track the current user
}

const ChatDetail: React.FC<ChatDetailProps> = ({ chatId, clientId }) => {
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!clientId || !chatId) return; // Ensure both clientId and chatId are available

    const chatQuery = query(
      collection(db, "messages"),
      where("propertyId", "==", chatId)
    );

    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      setChatMessages(messagesData);
    });

    return () => unsubscribe();
  }, [clientId, chatId]);

  return (
    <div>
      <h3 className="text-xl font-semibold">Chat Details for {chatId}</h3>
      {chatMessages.length === 0 ? (
        <p>No messages in this chat.</p>
      ) : (
        <ul className="list-disc pl-5">
          {chatMessages.map((msg) => (
            <li key={msg.id}>
              <strong>{msg.from === "user" ? "You" : "Realtor"}:</strong> {msg.message}
            </li>
          ))}
        </ul>
      )}
      {/* Include MessageInput component for typing new messages */}
    </div>
  );
};

export default ChatDetail;
