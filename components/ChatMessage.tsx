"use client";
import ReactMarkdown from "react-markdown";
import Image from "@/components/Image";
import { FAILED_ASSISTANT_MESSAGE } from "@/components/chatFailureCopy";
import type { ChatCitationData } from "./ChatMessageContainer";


interface ChatMessageProps {
  text: string;
  sender: "ai" | "user";
  name?: string;
  avatar?: string; // image URL or emoji
  status?: "PENDING" | "COMPLETED" | "FAILED";
  failureCode?: string | null;
  grounding?: {
    attemptId: string;
    insufficientContext: boolean;
    sufficiencyStatus: string;
    sufficiencyReason: string;
    confidence: string;
  } | null;
  citations?: ChatCitationData[];
  onRetry?: () => void;
  onCitationClick?: (citation: ChatCitationData) => void;
  retrying?: boolean;
}

export default function ChatMessage({
  text,
  sender,
  name,
  avatar,
  status = "COMPLETED",
  grounding,
  citations = [],
  onRetry,
  onCitationClick,
  retrying = false,
}: ChatMessageProps) {
  const isUser = sender === "user";
  const isPending = status === "PENDING";
  const isFailed = status === "FAILED";
  const showCitations = !isPending && !isFailed && citations.length > 0;
  const isInsufficient = Boolean(grounding?.insufficientContext);

  return (
    <div
      data-chat-message
      data-sender={sender}
      className={`flex items-start gap-2 w-full min-w-0 ${isUser ? "justify-end text-right" : "justify-start text-left"
        }`}
    >
      {/* Avatar (left for AI, right for user) */}
      {!isUser && avatar && (
        <Image
          dataChatAvatar
          src={avatar}
          alt={name ?? ""}
          className="!h-9 !w-9 min-w-[36px] max-w-[36px] shrink-0 rounded-full object-cover"
          sizes="32px"
          widths={[32, 64]}
          width={36}
          height={36}
          rounded="full"
        />
      )}

      {/* Message + Name wrapper */}
      <div className={`flex min-w-0 max-w-[78%] flex-col sm:max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
        {name && <div className="mb-1 text-xs font-medium text-gray-500">{name}</div>}

        <div
          className={`max-w-full overflow-hidden break-words rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${isUser
              ? "bg-primary-500 text-background"
              : isFailed
                ? "bg-red-50 text-red-900 border border-red-100"
                : isInsufficient
                  ? "bg-amber-50 text-amber-950 border border-amber-100"
                  : "bg-gray-100 text-gray-900"
            }`}
        >
          {isPending ? (
            <div className="flex min-h-5 items-center gap-2 text-gray-600">
              <span className="h-2 w-2 rounded-full bg-primary-400 animate-pulse" />
              <span className="h-2 w-2 rounded-full bg-primary-300 animate-pulse [animation-delay:120ms]" />
              <span className="h-2 w-2 rounded-full bg-primary-200 animate-pulse [animation-delay:240ms]" />
            </div>
          ) : isFailed ? (
            <div className="space-y-2">
              <p>{FAILED_ASSISTANT_MESSAGE}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={retrying ? undefined : onRetry}
                  disabled={retrying}
                  className="rounded-md bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 transition hover:bg-red-200 disabled:opacity-60"
                >
                  {retrying ? "Retrying..." : "Retry"}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="prose prose-sm max-w-none break-words prose-p:my-1 prose-pre:max-w-full prose-pre:overflow-x-auto">
                <ReactMarkdown skipHtml>{text}</ReactMarkdown>
              </div>
              {showCitations && (
                <div className="flex flex-wrap gap-2 border-t border-black/5 pt-2">
                  {citations.map((citation) => (
                    <button
                      key={citation.id}
                      type="button"
                      onClick={() => onCitationClick?.(citation)}
                      className="rounded-full border border-primary-200 bg-white px-2.5 py-1 text-xs font-semibold text-primary-800 transition hover:bg-primary-50"
                    >
                      {citation.sourceLabel}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}


        </div>
      </div>

      {isUser && avatar && (
        <Image
          dataChatAvatar
          src={avatar}
          alt={name ?? ""}
          className="!h-9 !w-9 min-w-[36px] max-w-[36px] shrink-0 rounded-full object-cover"
          sizes="32px"
          widths={[32, 64]}
          width={36}
          height={36}
          rounded="full"
        />
      )}
    </div>
  );
}
