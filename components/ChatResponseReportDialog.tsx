"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { CHAT_REPORT_REASONS, type ChatReportInput, type ChatReportReceipt } from "@/lib/ai/chat-report";
import type { ChatMessageData } from "./ChatMessageContainer";

export default function ChatResponseReportDialog({ chatId, message, onClose }: {
  chatId: string;
  message: ChatMessageData;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reasonRef = useRef<HTMLSelectElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState<ChatReportInput["reason"]>("INCORRECT");
  const [details, setDetails] = useState("");
  const [report, setReport] = useState<ChatReportReceipt | null>(null);
  const [checking, setChecking] = useState(true);
  const [checkFailed, setCheckFailed] = useState(false);
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endpoint = `/api/v1/ai/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(String(message.id))}/report`;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Report lookup failed");
        const data = await response.json();
        if (!controller.signal.aborted) setReport(data.report);
      } catch {
        if (!controller.signal.aborted) setCheckFailed(true);
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [endpoint, checkAttempt]);

  useEffect(() => {
    if (!checking && !checkFailed) (report ? doneRef.current : reasonRef.current)?.focus();
  }, [checking, checkFailed, report]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason, details }) });
      if (!response.ok) throw new Error("Report submission failed");
      const data = await response.json();
      setReport(data.report);
    } catch { setError("We couldn't send your report. Your details are still here; please try again."); }
    finally { setSending(false); }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="chat-report-title"
      aria-describedby="chat-report-description"
      className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-primary-200 bg-white p-5 shadow-2xl backdrop:bg-gray-950/40"
      onCancel={(event) => { event.preventDefault(); if (!sending) onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget && !sending) onClose(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), select:not(:disabled), textarea:not(:disabled)");
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) event.preventDefault();
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="chat-report-title" className="text-xl font-semibold text-[#6C3483]">Report this response</h2>
        <button type="button" aria-label="Close report" disabled={sending} onClick={onClose} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-700 hover:bg-primary-50 disabled:opacity-50"><X aria-hidden="true" size={22} /></button>
      </div>
      <p id="chat-report-description" className="mt-3 text-sm text-gray-600">The selected response and its question are attached for Study Buddy support to review.</p>
      {checking ? <p role="status" className="mt-4">Checking report status…</p> : checkFailed ? (
        <div className="mt-4">
          <p role="alert">We couldn&apos;t check this report. Please try again.</p>
          <button type="button" onClick={() => { setChecking(true); setCheckFailed(false); setCheckAttempt((value) => value + 1); }} className="mt-3 min-h-11 rounded-xl bg-primary-500 px-4 text-white">Try again</button>
        </div>
      ) : report ? (
        <div className="mt-4 space-y-3">
          <p role="status" className="font-semibold text-primary-800">{report.status === "REVIEWED" ? "Reviewed by Study Buddy support" : "Report received — awaiting review"}</p>
          <p className="break-all text-sm text-gray-600">Reference: {report.id}</p>
          {report.resolutionNote && <p className="whitespace-pre-wrap text-gray-800">{report.resolutionNote}</p>}
          <p className="text-sm text-gray-600">Reopen Report on this response to check its status.</p>
          <button ref={doneRef} type="button" onClick={onClose} className="min-h-11 rounded-xl bg-primary-500 px-5 text-white">Done</button>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-4">
          <blockquote className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-xl bg-primary-50 p-3 text-sm text-gray-700" tabIndex={0}>{message.text.slice(0, 1000)}{message.text.length > 1000 ? "…" : ""}</blockquote>
          <label className="block text-sm font-medium text-gray-900">Reason
            <select ref={reasonRef} value={reason} onChange={(event) => setReason(event.target.value as ChatReportInput["reason"])} disabled={sending} className="mt-1 min-h-11 w-full rounded-xl border border-primary-200 bg-white px-3">
              {Object.entries(CHAT_REPORT_REASONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-900">Anything else? (optional)
            <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={2000} rows={3} disabled={sending} className="mt-1 w-full resize-y rounded-xl border border-primary-200 p-3 font-normal" />
          </label>
          {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
          <button type="submit" disabled={sending} className="min-h-11 rounded-xl bg-primary-500 px-5 font-medium text-white disabled:cursor-wait disabled:opacity-60">{sending ? "Sending report…" : "Send report"}</button>
        </form>
      )}
    </dialog>
  );
}
