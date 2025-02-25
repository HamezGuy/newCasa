import React from "react";

interface Chat {
  propertyId: string;
  clientId: string;
  propertyTitle?: string;
  lastMessage?: string;
  lastActivity?: any;
  unread?: number;
}

interface ChatListProps {
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
  selectedChatId: string | null;
  isLoading?: boolean;
}

const ChatList: React.FC<ChatListProps> = ({ 
  chats, 
  onSelectChat, 
  selectedChatId,
  isLoading = false 
}) => {
  if (isLoading) {
    return <div className="border rounded-lg p-4 text-gray-500">Loading conversations...</div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden h-[70vh]">
      <h2 className="text-lg font-semibold p-4 bg-gray-100 border-b">Conversations</h2>
      {chats.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <p>No conversations available.</p>
          <p className="text-sm mt-2">Start by messaging a property listing.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-y-auto max-h-[calc(70vh-3.5rem)]">
          {chats.map((chat) => (
            <li
              key={chat.propertyId}
              onClick={() => onSelectChat(chat.propertyId)}
              className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedChatId === chat.propertyId ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="font-medium">
                  {chat.propertyTitle || `Property #${chat.propertyId}`}
                </div>
                {chat.unread && chat.unread > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                    {chat.unread}
                  </span>
                )}
              </div>
              
              {chat.lastMessage && (
                <p className="text-sm text-gray-500 mt-1 truncate">
                  {chat.lastMessage}
                </p>
              )}
              
              {chat.lastActivity && (
                <p className="text-xs text-gray-400 mt-1">
                  {typeof chat.lastActivity === 'object' && chat.lastActivity.toDate
                    ? new Date(chat.lastActivity.toDate()).toLocaleString()
                    : chat.lastActivity}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ChatList;