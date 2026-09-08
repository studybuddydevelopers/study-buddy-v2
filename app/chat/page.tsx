// app/chat/page.tsx

import type { Metadata } from "next";
import ChatClient from "./ChatClient";

export const metadata: Metadata = {
  title: "AI Study Chat | Study Buddy",
  description:
    "Ask Study Buddy for explanations, guided practice, and study support while keeping AI limitations in view.",
};

export default function ChatPage() {
  return <ChatClient />;
}
