import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import LocalDateTime from "@/components/LocalDateTime";
import ReadNotificationOnOpen from "@/components/ReadNotificationOnOpen";
import { requireUser } from "@/lib/auth";
import { markingReviewStatusLabel } from "@/lib/marking-review";
import { prisma } from "@/lib/prisma";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Marking Review Decision",
  description: "Read the support decision on your reported mock-exam answer, including the reviewed mark and explanation.",
  index: false,
});

export default async function MarkingReviewDecisionPage({ params }: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireUser();
  if ("errorResponse" in auth) {
    if (auth.errorResponse?.status === 401) redirect("/login");
    redirect("/unauthorized");
  }
  const { id } = await params;
  const review = await prisma.mockExamMarkingReview.findFirst({
    where: { id, userId: auth.dbUser.id },
    select: {
      reference: true, status: true, paperTitleSnapshot: true,
      subjectNameSnapshot: true, questionReferenceSnapshot: true,
      questionTextSnapshot: true, learnerAnswerSnapshot: true,
      learnerReason: true, originalScore: true, revisedScore: true, maxScore: true,
      resolutionNote: true, resolvedAt: true, submittedAt: true,
      mockExamInstanceId: true, mockExamAnswerId: true,
      notification: { select: { id: true, readAt: true } },
    },
  });
  if (!review) notFound();

  const linkStyle = "inline-flex min-h-11 items-center justify-center rounded-xl border border-primary-200 px-4 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-12 max-[320px]:px-[7.5px]">
      <Link href="/notifications" className={linkStyle}>Back to notifications</Link>
      {review.notification && !review.notification.readAt ? <ReadNotificationOnOpen id={review.notification.id} /> : null}
      <header>
        <p className="break-all text-sm font-semibold text-primary-700">Case {review.reference}</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">{markingReviewStatusLabel(review.status)}</h1>
        <p className="mt-3 break-words leading-7 text-gray-700">{review.paperTitleSnapshot} · {review.subjectNameSnapshot} · {review.questionReferenceSnapshot}</p>
      </header>
      <section aria-labelledby="review-decision" className="rounded-2xl border border-primary-200 bg-primary-50 p-4 sm:p-6">
        <h2 id="review-decision" className="text-xl font-bold text-gray-950">{review.status === "PENDING" ? "Awaiting support review" : "Support decision"}</h2>
        <dl className="my-4 grid gap-4 min-[425px]:grid-cols-2">
          <div><dt className="text-sm text-gray-600">Original mark</dt><dd className="mt-1 text-xl font-bold text-gray-950">{review.originalScore} / {review.maxScore}</dd></div>
          <div><dt className="text-sm text-gray-600">Current mark</dt><dd className="mt-1 text-xl font-bold text-primary-800">{review.revisedScore ?? review.originalScore} / {review.maxScore}</dd></div>
        </dl>
        <p className="whitespace-pre-wrap break-words leading-7 text-gray-800">{review.resolutionNote ?? "Study Buddy support will review the attached question, answer and marking evidence. You'll receive a notification when the decision is ready."}</p>
        {review.status === "MARK_ADJUSTED" ? <p className="mt-3 leading-7 text-gray-700">Your paper total has been recalculated. Progress has also been updated where this is your latest graded paper for the subject.</p> : null}
        <p className="mt-4 text-sm text-gray-600">{review.resolvedAt ? "Reviewed " : "Submitted "}<LocalDateTime value={(review.resolvedAt ?? review.submittedAt).toISOString()} /></p>
      </section>
      <section aria-labelledby="review-question" className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
        <h2 id="review-question" className="text-xl font-bold text-gray-950">The question</h2>
        <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-gray-800">{review.questionTextSnapshot}</p>
        <h3 className="mt-6 text-lg font-semibold text-gray-950">Your submitted answer</h3>
        <p className="mt-2 whitespace-pre-wrap break-words leading-7 text-gray-700">{review.learnerAnswerSnapshot}</p>
        <h3 className="mt-6 text-lg font-semibold text-gray-950">Why you requested a review</h3>
        <p className="mt-2 whitespace-pre-wrap break-words leading-7 text-gray-700">{review.learnerReason}</p>
      </section>
      <div className="flex flex-wrap gap-3">
        <Link prefetch={false} className={linkStyle} href={`/exams/${encodeURIComponent(review.mockExamInstanceId)}#answer-${encodeURIComponent(review.mockExamAnswerId)}`}>Open this question in the marked paper</Link>
        <Link href="/marking-reviews" className={linkStyle}>All marking reviews</Link>
      </div>
    </div>
  );
}
