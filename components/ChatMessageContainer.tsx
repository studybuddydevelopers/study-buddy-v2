"use client";

import ChatMessage from "./ChatMessage";

export interface ChatMessageData {
  id: string | number;
  sender: "ai" | "user";
  name?: string;
  text: string;
  avatar?: string;
}

interface ChatMessageContainerProps {
  messages: ChatMessageData[];
}

export default function ChatMessageContainer({ messages }: Readonly<ChatMessageContainerProps>) {
  return (
    <div className="flex flex-col w-full space-y-4">
      {messages.map((msg) => (
        <ChatMessage
          key={msg.id}
          sender={msg.sender}
          name={msg.name}
          text={msg.text}
          avatar={msg.avatar}
        />
      ))}
    </div>
  );
}
