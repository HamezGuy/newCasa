// src/app/messages/page.tsx
"use client";

import { Message } from "@/app/types/Messages";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import ChatDetail from "./chatdetail";
import ChatList from "./chatlist";

export default function MessagesPage() {
  const [chats, setChats] = useState<{ [key: string]: Message[] }>({});
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const messagesQuery = query(
      collection(db, "messages"),
      where("clientId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const groupedMessages: { [key: string]: Message[] } = {};

      snapshot.docs.forEach((doc) => {
        const message = doc.data() as Message;
        if (!groupedMessages[message.propertyId]) {
          groupedMessages[message.propertyId] = [];
        }
        groupedMessages[message.propertyId].push(message);
      });

      setChats(groupedMessages);
    });

    return () => unsubscribe();
  }, [user]);

  const chatListProps = {
    chats, // Passing 'chats' correctly now
    onSelectChat: setSelectedChat,
  };

  const chatDetailProps = {
    chatId: selectedChat,
    clientId: user?.uid || "",
  };

  return (
    <div className="container mx-auto mt-10">
      <h2 className="text-2xl font-bold">Your Messages</h2>
      <div className="flex">
        <div className="w-1/3 pr-4">
          <ChatList {...chatListProps} />
        </div>
        <div className="w-2/3">
          {selectedChat ? (
            <ChatDetail {...chatDetailProps} />
          ) : (
            <p>Select a chat to view messages.</p>
          )}
        </div>
      </div>
    </div>
  );
}
