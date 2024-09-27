// src/app/messages/page.tsx
"use client";

import { Message } from "@/app/types/types"; // Adjust import based on your project structure
import ChatDetail from "@/components/messages/ChatDetail"; // Adjust the path based on your project structure
import ChatList from "@/components/messages/ChatList"; // Adjust the path based on your project structure
import { auth, db } from "@/config/firebase"; // Ensure db is imported
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]); // Use the Message interface
  const [selectedChat, setSelectedChat] = useState<string | null>(null); // State to track selected chat
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const messagesQuery = query(
      collection(db, "messages"),
      where("clientId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[]; // Cast to Message type

      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="container mx-auto mt-10">
      <h2 className="text-2xl font-bold">Your Messages</h2>
      <div className="flex">
        <div className="w-1/3 pr-4">
          <ChatList messages={messages} onSelectChat={setSelectedChat} />
        </div>
        <div className="w-2/3">
          {selectedChat ? (
            <ChatDetail chatId={selectedChat} /> // Pass the selected chat ID
          ) : (
            <p>Select a chat to view messages.</p>
          )}
        </div>
      </div>
    </div>
  );
}
