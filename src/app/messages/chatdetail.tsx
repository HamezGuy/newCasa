import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";

interface Message {
  id: string;
  sender: string;
  message: string;
  timestamp: any;
}

interface ChatDetailProps {
  chatId: string | null; // Allow chatId to be null
  clientId: string;
}

const ChatDetail: React.FC<ChatDetailProps> = ({ chatId, clientId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!chatId) return; // Ensure chatId is available

    const messagesQuery = query(
      collection(db, "messages"),
      where("chatId", "==", chatId)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId) return;

    try {
      await addDoc(collection(db, "messages"), {
        chatId,
        sender: clientId,
        message: newMessage,
        timestamp: serverTimestamp(),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  if (!chatId) {
    return <p>Select a chat to view messages.</p>;
  }

  return (
    <div>
      <h3>Chat for Property {chatId}</h3>
      <ul>
        {messages.map((msg) => (
          <li key={msg.id}>
            <strong>{msg.sender === clientId ? "You" : "Realtor"}:</strong> {msg.message}
          </li>
        ))}
      </ul>
      <textarea
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type your message"
        className="w-full p-2 border rounded"
      />
      <button onClick={sendMessage} className="btn mt-2">
        Send
      </button>
    </div>
  );
};

export default ChatDetail;
