// src/components/messages/ChatList.tsx
import { Message } from "@/app/types/types";
import React from "react";

interface ChatListProps {
  messages: Message[];
  onSelectChat: (chatId: string) => void; 
}

const ChatList: React.FC<ChatListProps> = ({ messages, onSelectChat }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Chat List</h2>
      {messages.length === 0 ? (
        <p>No chats available.</p>
      ) : (
        <ul className="list-disc pl-5">
          {messages.map((msg) => (
            <li key={msg.id} onClick={() => onSelectChat(msg.propertyId)} className="cursor-pointer hover:bg-gray-100">
              <strong>{msg.from === "user" ? "You" : "Realtor"}:</strong> {msg.message} (Property: {msg.propertyId})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatList;
