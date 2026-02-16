// app/chat/ChatClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import ChatMessageContainer, {
  type ChatMessageData,
} from "@/components/ChatMessageContainer";

interface ApiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface MeResponse {
  profile: {
    avatarUrl?: string | null;
  } | null;
}

async function sendMessageApi(message: string, subjectId?: string) {
  const res = await fetch("/api/v1/ai/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, subjectId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || "Failed to send message");
  }

  const data = await res.json();
  return data?.aiResponse || "I couldn't generate a reply.";
}

export default function ChatClient() {
  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: "welcome",
      sender: "ai",
      name: "AI Tutor",
      text: "Hi! Ask me any study question or request practice problems. I'm here to help.",
      avatar: "https://i.pravatar.cc/40?img=32",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | undefined>(undefined);
  const [me, setMe] = useState<MeResponse | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/v1/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as MeResponse;
        setMe(data);
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    };

    void fetchMe();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setError(null);

    const userMessage: ChatMessageData = {
      id: crypto.randomUUID(),
      sender: "user",
      name: "You",
      text: userText,
      avatar: me?.profile?.avatarUrl ?? "https://img.icons8.com/?size=100&id=HEBTcR9O3uzR&format=png&color=000000",
    };
    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);
    try {
      const reply = await sendMessageApi(userText, subjectId);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          name: "AI Tutor",
          text: reply,
          avatar: "https://i.pravatar.cc/40?img=32",
        },
      ]);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "ai",
          name: "AI Tutor",
          text:
            "Sorry, I couldn't respond right now. Please try again in a moment.",
          avatar: "https://i.pravatar.cc/40?img=32",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="w-[90vw] max-w-5xl mx-auto py-6 flex flex-col gap-4 min-h-[calc(100vh-120px)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Heading1 gutter="sm">AI Chat</Heading1>
          <Paragraph variant="superMuted" gutter="none">
            Ask questions like you would on ChatGPT. Shift+Enter for new line.
          </Paragraph>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <label className="flex items-center gap-2">
            <span>Subject (optional)</span>
            <input
              type="text"
              className="border border-accent-200 rounded-md px-2 py-1 text-sm"
              value={subjectId ?? ""}
              onChange={(e) =>
                setSubjectId(e.target.value.trim() ? e.target.value : undefined)
              }
              placeholder="Subject ID"
            />
          </label>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto border border-accent-200 rounded-2xl bg-white shadow-sm p-4"
      >
        <ChatMessageContainer messages={messages} />
        {loading && (
          <div className="mt-4 bg-gray-50 text-gray-900 border border-accent-100 p-3 rounded-xl max-w-3xl">
            <p className="text-sm font-semibold mb-1">AI Tutor</p>
            <p className="text-gray-600">Thinking...</p>
          </div>
        )}
      </div>

      {error && (
        <Paragraph variant="error" className="mt-1">
          {error}
        </Paragraph>
      )}

      <div className="border border-accent-200 rounded-2xl bg-white shadow-sm p-4 space-y-3">
        <textarea
          className="w-full border border-accent-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-400 text-gray-900 max-h-28"
          placeholder="Ask anything... Shift+Enter for new line"
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <div className="flex items-center justify-between gap-3 flex-wrap max-h-11">
          <Paragraph variant="muted" gutter="none" className="text-sm">
            Press Enter to send, Shift+Enter for new line.
          </Paragraph>
          <Button
            variant="primary"
            onClick={handleSend}
            loading={loading}
            disabled={loading || !input.trim()}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
