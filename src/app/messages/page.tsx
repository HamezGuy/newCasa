"use client";

import ChatDetail from "@/app/messages/chatdetail";
import ChatList from "@/app/messages/chatlist";
import { auth, db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  onSnapshot, 
  orderBy, 
  query, 
  where,
  getDocs
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

interface Chat {
  propertyId: string;
  clientId: string;
  propertyTitle?: string;
  lastMessage?: string;
  lastActivity?: any;
  unread?: number;
}

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auth state management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch chats when user logs in
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Query for chats where the user is the client
    const chatsQuery = query(
      collection(db, "chats"),
      where("clientId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      // Process each chat document and enrich with additional data
      const chatsPromises = snapshot.docs.map(async (chatDoc) => {
        const chatData = chatDoc.data();
        
        // Get the most recent message for this chat
        const messagesQuery = query(
          collection(db, "messages"),
          where("chatId", "==", chatDoc.id),
          orderBy("timestamp", "desc")
        );
        
        // Use getDocs instead of get()
        const messagesSnapshot = await getDocs(messagesQuery);
        let lastMessage = undefined;
        let lastActivity = undefined;
        
        if (!messagesSnapshot.empty) {
          const lastMessageData = messagesSnapshot.docs[0].data();
          lastMessage = lastMessageData.message;
          lastActivity = lastMessageData.timestamp;
        }
        
        // Try to get property details if available
        let propertyTitle = undefined;
        try {
          // Assuming you have a properties collection. Adjust accordingly.
          const propertyDoc = await getDoc(doc(db, "properties", chatData.propertyId));
          if (propertyDoc.exists()) {
            propertyTitle = propertyDoc.data().title || `Property #${chatData.propertyId}`;
          }
        } catch (error) {
          console.log("Error fetching property details:", error);
        }
        
        return {
          propertyId: chatDoc.id,
          clientId: chatData.clientId,
          propertyTitle: propertyTitle || `Property #${chatData.propertyId}`,
          lastMessage,
          lastActivity,
          // Additional fields like unread count could be added here
        };
      });
      
      const enrichedChats = await Promise.all(chatsPromises);
      
      // Sort chats by last activity if available
      enrichedChats.sort((a, b) => {
        if (!a.lastActivity) return 1;
        if (!b.lastActivity) return -1;
        return b.lastActivity - a.lastActivity;
      });
      
      setChats(enrichedChats);
      setIsLoading(false);
      
      // Auto-select the first chat if none is selected
      if (enrichedChats.length > 0 && !selectedChat) {
        setSelectedChat(enrichedChats[0].propertyId);
      }
    });

    return () => unsubscribe();
  }, [user, loading, selectedChat]);

  if (loading) {
    return <div className="container mx-auto mt-10 text-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="container mx-auto mt-10 text-center">
        <h2 className="text-2xl font-bold">Please Sign In</h2>
        <p className="mt-4">You need to be signed in to view your messages.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-10 px-4">
      <h2 className="text-2xl font-bold mb-6">Your Messages</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ChatList 
            chats={chats} 
            onSelectChat={setSelectedChat} 
            selectedChatId={selectedChat}
            isLoading={isLoading}
          />
        </div>
        <div className="lg:col-span-2">
          {selectedChat && (
            <ChatDetail 
              chatId={selectedChat} 
              clientId={user.uid} 
              propertyTitle={chats.find(chat => chat.propertyId === selectedChat)?.propertyTitle}
            />
          )}
        </div>
      </div>
    </div>
  );
}