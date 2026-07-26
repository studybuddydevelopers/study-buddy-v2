"use client";
import ReactMarkdown from "react-markdown";
import Image from "@/components/Image";


interface ChatMessageProps {
  text: string;
  sender: "ai" | "user";
  name?: string;
  avatar?: string; // image URL or emoji
}

export default function ChatMessage({
  text,
  sender,
  name,
  avatar,
}: ChatMessageProps) {
  const isUser = sender === "user";

  return (
    <div
      className={`flex items-start gap-2 w-full mb-4 ${isUser ? "justify-end text-right" : "justify-start text-left"
        }`}
    >
      {/* Avatar (left for AI, right for user) */}
      {!isUser && avatar && (
        <Image
          src={avatar}
          alt={name ?? ""}
          className="h-8 w-8 rounded-full object-cover"
          sizes="32px"
          widths={[32, 64]}
        />
      )}

      {/* Message + Name wrapper */}
      <div className="flex flex-col">
        {name && <div className="text-sm text-gray-500 mb-1">{name}</div>}

        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-lg ${isUser
              ? "bg-primary-500 text-background"
              : "bg-gray-100 text-gray-900"
            }`}
        >
          <div
            className="prose prose-sm max-w-none"
          ><ReactMarkdown skipHtml>{text}</ReactMarkdown></div>


        </div>
      </div>

      {isUser && avatar && (
        <Image
          src={avatar}
          alt={name ?? ""}
          className="h-8 w-8 rounded-full object-cover"
          sizes="32px"
          widths={[32, 64]}
        />
      )}
    </div>
  );
}
