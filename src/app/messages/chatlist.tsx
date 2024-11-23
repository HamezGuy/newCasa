import React from "react";

interface Chat {
  propertyId: string;
  clientId: string;
}

interface ChatListProps {
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ chats, onSelectChat }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Chat List</h2>
      {chats.length === 0 ? (
        <p>No chats available.</p>
      ) : (
        <ul className="list-disc pl-5">
          {chats.map((chat) => (
            <li
              key={chat.propertyId}
              onClick={() => onSelectChat(chat.propertyId)}
              className="cursor-pointer hover:bg-gray-100"
            >
              <strong>Property: {chat.propertyId}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatList;
