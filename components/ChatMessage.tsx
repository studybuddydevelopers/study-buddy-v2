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
          className="!h-12 !w-12 min-w-[48px] max-w-[48px] shrink-0 rounded-full object-cover"
          sizes="48px"
          widths={[48, 96]}
          width={48}
          height={48}
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
            <div
              className="flex min-h-16 items-center justify-center gap-2 px-2"
              role="status"
              aria-label={`${name ?? "AI Tutor"} is responding`}
            >
              {avatar &&
                ["one", "two", "three"].map((coin) => (
                  <span
                    key={coin}
                    aria-hidden="true"
                    className={`ai-avatar-coin-loader ai-avatar-coin-loader--${coin} inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary-200 bg-white p-1 shadow-sm`}
                  >
                    <Image
                      dataChatAvatar
                      src={avatar}
                      alt=""
                      className="!h-12 !w-12 min-w-[48px] max-w-[48px] shrink-0 rounded-full object-cover"
                      sizes="48px"
                      widths={[48, 96]}
                      width={48}
                      height={48}
                      rounded="full"
                    />
                  </span>
                ))}
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
              <div className="max-w-none break-words text-left [&_a]:font-medium [&_a]:text-primary-700 [&_a]:underline [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_li]:my-1 [&_li]:pl-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
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
          className="!h-12 !w-12 min-w-[48px] max-w-[48px] shrink-0 rounded-full object-cover"
          sizes="48px"
          widths={[48, 96]}
          width={48}
          height={48}
          rounded="full"
        />
      )}
    </div>
  );
}
