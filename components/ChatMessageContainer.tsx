"use client";

import ChatMessage from "./ChatMessage";

export interface ChatCitationData {
  id: string;
  sourceLabel: string;
  resourceId: string;
  resourceChunkId: string;
  contentHash: string;
  retrievalRank?: number | null;
  vectorDistance?: number | null;
  keywordRank?: number | null;
  fusionScore?: number | null;
}

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
  grounding?: {
    attemptId: string;
    insufficientContext: boolean;
    sufficiencyStatus: string;
    sufficiencyReason: string;
    confidence: string;
  } | null;
  citations?: ChatCitationData[];
}

interface ChatMessageContainerProps {
  messages: ChatMessageData[];
  onRetry?: (message: ChatMessageData) => void;
  onCitationClick?: (citation: ChatCitationData) => void;
}

export default function ChatMessageContainer({
  messages,
  onRetry,
  onCitationClick,
}: Readonly<ChatMessageContainerProps>) {
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
          grounding={msg.grounding}
          citations={msg.citations}
          retrying={msg.retrying}
          onRetry={
            msg.sender === "ai" && msg.status === "FAILED" && msg.requestId
              ? () => onRetry?.(msg)
              : undefined
          }
          onCitationClick={onCitationClick}
        />
      ))}
    </div>
  );
}
