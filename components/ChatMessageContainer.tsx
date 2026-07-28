"use client";

import ChatMessage from "./ChatMessage";

export interface ChatMessageData {
  id: string | number;
  sender: "ai" | "user";
  name?: string;
  text: string;
  avatar?: string;
  status?: "PENDING" | "COMPLETED" | "FAILED";
  failureCode?: string | null;
  requestId?: string | null;
  retrying?: boolean;
  createdAt?: string;
}

interface ChatMessageContainerProps {
  messages: ChatMessageData[];
  onRetry?: (message: ChatMessageData) => void;
}

export default function ChatMessageContainer({ messages, onRetry }: Readonly<ChatMessageContainerProps>) {
  return (
    <div className="flex w-full min-w-0 flex-col space-y-3">
      {messages.map((msg) => (
        <ChatMessage
          key={msg.id}
          sender={msg.sender}
          name={msg.name}
          text={msg.text}
          avatar={msg.avatar}
          status={msg.status}
          failureCode={msg.failureCode}
          retrying={msg.retrying}
          onRetry={
            msg.sender === "ai" && msg.status === "FAILED" && msg.requestId
              ? () => onRetry?.(msg)
              : undefined
          }
        />
      ))}
    </div>
  );
}
