import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMarkingReviewSupport } from "@/lib/marking-review-support";
import { createPageMetadata } from "@/lib/site-metadata";
import { prisma } from "@/lib/prisma";
import ChatReportReviewCard from "./ChatReportReviewCard";

export const metadata = createPageMetadata({
  title: "Chat Response Reports",
  description: "Restricted Study Buddy support workspace for reviewing reported tutor responses.",
  index: false,
});

export default async function ChatReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const auth = await requireMarkingReviewSupport();
  if ("errorResponse" in auth) notFound();
  const query = await searchParams;
  const status = query.status === "REVIEWED" ? "REVIEWED" : "OPEN";
  const page = Math.min(100000, Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1));
  const reports = await prisma.aiChatMessageReport.findMany({
    where: { status, message: { chat: { deletedAt: null } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: (page - 1) * 25, take: 26,
    include: { message: { include: { chat: { select: { title: true } }, assistantGenerationRequest: { select: { userMessage: { select: { content: true } } } } } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <Link href="/support/marking-reviews" className="inline-flex min-h-11 items-center text-primary-700 underline">Marking review queue</Link>
      <h1 className="text-3xl font-semibold text-[#6C3483]">Chat response reports</h1>
      <nav aria-label="Report status" className="flex flex-wrap gap-3">
        {(["OPEN", "REVIEWED"] as const).map((value) => <Link key={value} href={`/support/chat-reports?status=${value}`} aria-current={status === value ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-xl border border-primary-200 px-4 ${status === value ? "bg-primary-500 text-white" : "text-primary-800"}`}>{value === "OPEN" ? "Awaiting review" : "Reviewed"}</Link>)}
      </nav>
      {reports.length === 0 && <p>No reports in this view.</p>}
      {reports.slice(0, 25).map((report) => <ChatReportReviewCard key={report.id} initialReport={{
        id: report.id, status: report.status, reason: report.reason, details: report.details,
        createdAt: report.createdAt.toISOString(), reviewedAt: report.reviewedAt?.toISOString() ?? null,
        resolutionNote: report.resolutionNote, title: report.message.chat.title,
        question: report.message.assistantGenerationRequest?.userMessage.content ?? "",
        response: report.message.content,
      }} />)}
      <nav aria-label="Report pages" className="flex flex-wrap gap-4">
        {page > 1 && <Link className="inline-flex min-h-11 items-center text-primary-700 underline" href={`/support/chat-reports?status=${status}&page=${page - 1}`}>Previous reports</Link>}
        {reports.length > 25 && <Link className="inline-flex min-h-11 items-center text-primary-700 underline" href={`/support/chat-reports?status=${status}&page=${page + 1}`}>More reports</Link>}
      </nav>
    </div>
  );
}
