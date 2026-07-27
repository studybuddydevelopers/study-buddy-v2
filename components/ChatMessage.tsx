"use client";
import ReactMarkdown from "react-markdown";
import Image from "@/components/Image";


interface ChatMessageProps {
  text: string;
  sender: "ai" | "user";
  name?: string;
  avatar?: string; // image URL or emoji
  status?: "PENDING" | "COMPLETED" | "FAILED";
  failureCode?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}

export default function ChatMessage({
  text,
  sender,
  name,
  avatar,
  status = "COMPLETED",
  failureCode,
  onRetry,
  retrying = false,
}: ChatMessageProps) {
  const isUser = sender === "user";
  const isPending = status === "PENDING";
  const isFailed = status === "FAILED";

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
              : isFailed
                ? "bg-red-50 text-red-900 border border-red-100"
                : "bg-gray-100 text-gray-900"
            }`}
        >
          {isPending ? (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="h-2 w-2 rounded-full bg-primary-400 animate-pulse" />
              <span className="h-2 w-2 rounded-full bg-primary-300 animate-pulse [animation-delay:120ms]" />
              <span className="h-2 w-2 rounded-full bg-primary-200 animate-pulse [animation-delay:240ms]" />
            </div>
          ) : isFailed ? (
            <div className="space-y-2">
              <p>
                Sorry, I couldn&apos;t respond right now
                {failureCode ? ` (${failureCode})` : ""}.
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={retrying ? undefined : onRetry}
                  disabled={retrying}
                  className="text-sm font-semibold text-red-700 underline disabled:opacity-60"
                >
                  {retrying ? "Retrying..." : "Retry"}
                </button>
              )}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown skipHtml>{text}</ReactMarkdown>
            </div>
          )}


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
