// components/messages/ChatDetail.tsx
import { Message } from "@/app/types/types";
import { auth, db } from "@/config/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";

interface ChatDetailProps {
  selectedChat: string; // Use the propertyId
}

const ChatDetail: React.FC<ChatDetailProps> = ({ selectedChat }) => {
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user || !selectedChat) return; 

    const chatQuery = query(
      collection(db, "messages"),
      where("propertyId", "==", selectedChat) 
    );

    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      setChatMessages(messagesData);
    });

    return () => unsubscribe();
  }, [user, selectedChat]);

  return (
    <div>
      <h3 className="text-xl font-semibold">Chat Details</h3>
      {chatMessages.length === 0 ? (
        <p>No messages in this chat.</p>
      ) : (
        <ul className="list-disc pl-5">
          {chatMessages.map((msg) => (
            <li key={msg.id}>
              <strong>{msg.from === 'user' ? 'You' : 'Realtor'}:</strong> {msg.message}
            </li>
          ))}
        </ul>
      )}
      {/* Include input field for sending new messages */}
      {/* Use a similar structure as ClientMessageForm to handle sending messages */}
    </div>
  );
};

export default ChatDetail;
