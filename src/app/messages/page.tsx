"use client";

import ChatDetail from "@/app/messages/chatdetail";
import ChatList from "@/app/messages/chatlist";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

export default function MessagesPage() {
  const [chats, setChats] = useState<{ propertyId: string; clientId: string }[]>(
    []
  );
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("clientId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const chatsData = snapshot.docs.map((doc) => ({
        propertyId: doc.data().propertyId,
        clientId: doc.data().clientId,
      }));
      setChats(chatsData);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="container mx-auto mt-10">
      <h2 className="text-2xl font-bold">Your Messages</h2>
      <div className="flex">
        <div className="w-1/3 pr-4">
          <ChatList chats={chats} onSelectChat={(chatId) => setSelectedChat(chatId)} />
        </div>
        <div className="w-2/3">
          <ChatDetail chatId={selectedChat} clientId={user?.uid || ""} />
        </div>
      </div>
    </div>
  );
}
