// app/chat/page.tsx

import { createPageMetadata } from "@/lib/site-metadata";
import ChatClient from "./ChatClient";

export const metadata = createPageMetadata({
  title: "AI Study Chat",
  description:
    "Use Study Buddy's AI chat for explanations, guided practice and revision support while keeping its limitations and source guidance in view.",
  index: false,
});

export default function ChatPage() {
  return <ChatClient />;
}
