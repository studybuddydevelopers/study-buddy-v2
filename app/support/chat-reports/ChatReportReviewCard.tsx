"use client";

import { useState } from "react";
import ChatMarkdown from "@/components/ChatMarkdown";
import { CHAT_REPORT_REASONS, type ChatReportInput, type ChatReportReceipt } from "@/lib/ai/chat-report";

export interface SupportChatReport extends ChatReportReceipt {
  reason: string;
  details: string;
  title: string;
  question: string;
  response: string;
}

export default function ChatReportReviewCard({ initialReport }: { initialReport: SupportChatReport }) {
  const [report, setReport] = useState(initialReport);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function review(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !note.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/support/chat-reports/${report.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolutionNote: note }),
      });
      if (!response.ok) throw new Error("Review failed");
      const data = await response.json();
      setReport((previous) => ({ ...previous, ...data.report }));
    } catch { setError("The review wasn't saved. Please try again."); }
    finally { setSaving(false); }
  }

  return (
    <article className="min-w-0 space-y-4 rounded-2xl border border-primary-200 bg-white p-5">
      <h2 className="text-xl font-semibold text-primary-900">{report.title}</h2>
      <p className="break-all text-sm text-gray-600">Reference: {report.id}</p>
      <p className="font-medium text-primary-800">{CHAT_REPORT_REASONS[report.reason as ChatReportInput["reason"]] ?? report.reason}</p>
      {report.details && <p className="whitespace-pre-wrap break-words">{report.details}</p>}
      <details className="rounded-xl border border-accent-700 p-3">
        <summary className="cursor-pointer py-2 font-medium">Question and reported response</summary>
        <div className="mt-4 space-y-4">
          <div><h3 className="mb-2 font-semibold">Question</h3><ChatMarkdown markdown={report.question || "Question unavailable."} /></div>
          <div><h3 className="mb-2 font-semibold">AI Study Buddy Tutor response</h3><ChatMarkdown markdown={report.response} /></div>
        </div>
      </details>
      {report.status === "REVIEWED" ? (
        <div><p role="status" className="font-semibold text-primary-800">Reviewed</p><p className="mt-2 whitespace-pre-wrap break-words">{report.resolutionNote}</p></div>
      ) : (
        <form onSubmit={(event) => void review(event)} className="space-y-3">
          <label className="block font-medium">Review note for the learner
            <textarea value={note} onChange={(event) => setNote(event.target.value)} required maxLength={2000} rows={3} disabled={saving} className="mt-2 w-full rounded-xl border border-primary-200 p-3 font-normal" />
          </label>
          {error && <p role="alert" className="text-red-800">{error}</p>}
          <button type="submit" disabled={saving || !note.trim()} className="min-h-11 rounded-xl bg-primary-500 px-4 font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Mark reviewed"}</button>
        </form>
      )}
    </article>
  );
}
