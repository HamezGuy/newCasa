"use client";

import { auth, db } from "@/config/firebase"; // Ensure db is imported
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
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
      }));
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="container mx-auto mt-10">
      <h2 className="text-2xl font-bold">Your Messages</h2>
      {messages.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        <ul className="list-disc pl-5">
          {messages.map((msg) => (
            <li key={msg.id}>
              <strong>{msg.from === 'user' ? 'You' : 'Realtor'}:</strong> {msg.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
