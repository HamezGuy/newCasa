// src/components/messages/ChatList.tsx
import { Message } from "@/app/types/Messages";
import React from "react";

// Update the interface to expect 'chats' and not 'messages'
export interface ChatListProps {  
  chats: { [key: string]: Message[] };
  onSelectChat: (chatId: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ chats, onSelectChat }) => {
  const chatKeys = Object.keys(chats); // Get the propertyIds (chat IDs) as keys

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Chat List</h2>
      {chatKeys.length === 0 ? (
        <p>No chats available.</p>
      ) : (
        <ul className="list-disc pl-5">
          {chatKeys.map((propertyId) => (
            <li
              key={propertyId}
              onClick={() => onSelectChat(propertyId)} // Use the propertyId as the chat identifier
              className="cursor-pointer hover:bg-gray-100"
            >
              <strong>Property: {propertyId}</strong> 
              {/* Optionally display the first message from the chat */}
              <p>{chats[propertyId][0]?.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatList;
