"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import Image from "@/components/Image";
import ChatMarkdown from "@/components/ChatMarkdown";
import { SbEqualizerLoadingPattern } from "@/components/SbSequentialFillPreview";
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
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const isUser = sender === "user";
  const isPending = status === "PENDING";
  const isFailed = status === "FAILED";
  const showCitations = !isPending && !isFailed && citations.length > 0;
  const isInsufficient = Boolean(grounding?.insufficientContext);

  async function copyResponse() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div
      data-chat-message
      data-sender={sender}
      className={`flex w-full min-w-0 ${isUser ? "justify-end" : "flex-col items-start"}`}
    >
      {!isUser && (
        <div className="mb-3 flex items-center gap-2.5">
          {avatar && (
            <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[3px] border-black bg-[#5e3194] sm:h-20 sm:w-20">
              <Image dataChatAvatar src={avatar} alt="" className="!h-[70%] !w-[70%] !object-contain" sizes="(min-width: 640px) 52px, 41px" widths={[52, 104]} width={80} height={80} rounded="none" />
            </span>
          )}
          <span className="text-sm font-semibold text-primary-900">{name ?? "AI Tutor"}</span>
        </div>
      )}

      <div className={`min-w-0 ${isUser ? "max-w-[90%] sm:max-w-[80%]" : "w-full"}`}>
        {isUser && <span className="sr-only">{name ?? "You"}:</span>}

        <div
          className={`max-w-full break-words text-base leading-7 ${isUser
              ? "rounded-3xl bg-primary-100 px-5 py-3 text-primary-900"
              : isFailed
                ? "rounded-2xl border border-red-100 bg-red-50 p-4 text-red-900"
                : isInsufficient
                  ? "rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-950"
                  : "text-gray-900"
            }`}
        >
          {isPending ? (
            <div
              className="flex min-h-11 items-center gap-3 text-sm text-gray-600"
              role="status"
              aria-label={`${name ?? "AI Tutor"} is responding`}
            >
              <span aria-hidden="true" className="shrink-0"><SbEqualizerLoadingPattern size={44} showMessage={false} /></span>
              Thinking through your question…
            </div>
          ) : isFailed ? (
            <div className="space-y-2">
              <p>{FAILED_ASSISTANT_MESSAGE}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={retrying ? undefined : onRetry}
                  disabled={retrying}
                  className="min-h-11 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-200 disabled:opacity-60"
                >
                  {retrying ? "Retrying..." : "Retry"}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <ChatMarkdown markdown={text} />
              {showCitations && (
                <div className="flex flex-wrap gap-2 border-t border-black/5 pt-2">
                  {citations.map((citation) => (
                    <button
                      key={citation.id}
                      type="button"
                      onClick={() => onCitationClick?.(citation)}
                      className="min-h-11 rounded-full border border-primary-200 bg-white px-3 py-2 text-xs font-semibold text-primary-800 transition hover:bg-primary-50"
                    >
                      {citation.sourceLabel}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}


        </div>
        {!isUser && !isPending && !isFailed && text && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
            <button
              type="button"
              onClick={() => void copyResponse()}
              aria-label={copyState === "copied" ? "Copy response again" : "Copy response"}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl hover:bg-primary-50 hover:text-primary-700"
            >
              {copyState === "copied" ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            </button>
            <span role="status">{copyState === "copied" ? "Copied" : copyState === "failed" ? "Could not copy. Select the text to copy it." : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}
