"use client";

import ChatMessage from "../components/ChatMessage";
import Heading1 from "../components/Heading1";

export default function ChatMessageDemo() {
  return (
    <div className="p-8 space-y-6 bg-background">
      <Heading1 gutter="md">Chat Message Demo</Heading1>
      <ChatMessage
        sender="ai"
        name="AI Tutor"
        text="Hi there! I’m your AI tutor. Ask me anything about your WAEC subjects, and I’ll do my best to help you understand and prepare effectively."
        avatar="https://i.pravatar.cc/40?img=32" // placeholder avatar
      />
      <ChatMessage
        sender="user"
        name="Sophia"
        text="Can you explain the concept of osmosis in biology?"
        avatar="https://i.pravatar.cc/40?img=5"
      />
    </div>
  );
}

