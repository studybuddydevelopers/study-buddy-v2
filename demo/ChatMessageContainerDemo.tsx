"use client";

import ChatMessageContainer, { type ChatMessageData } from "../components/ChatMessageContainer";
import Heading1 from "../components/Heading1";

export default function ChatMessageContainerDemo() {
  const messages: ChatMessageData[] = [
    {
      id: 1,
      sender: "ai",
      name: "AI Tutor",
      text: "Hi there! I’m your AI tutor. Ask me anything about your WAEC subjects, and I’ll do my best to help you understand and prepare effectively.",
      avatar: "https://i.pravatar.cc/40?img=32",
    },
    {
      id: 2,
      sender: "user",
      name: "Sophia",
      text: "Can you explain the concept of osmosis in biology?",
      avatar: "https://i.pravatar.cc/40?img=5",
    },
    {
      id: 3,
      sender: "ai",
      name: "AI Tutor",
      text: "Osmosis is the movement of water molecules through a semi-permeable membrane, from a region of lower solute concentration to a region of higher solute concentration.",
      avatar: "https://i.pravatar.cc/40?img=32",
    },
  ];

  return (
    <div className="p-8 bg-white max-w-5xl mx-auto">
      <Heading1 gutter="md">Chat Message Container Demo</Heading1>
      <ChatMessageContainer messages={messages} />
    </div>
  );
}
