import Link from "next/link";
import Heading1 from "@/components/Heading1";
import LocalDateTime from "@/components/LocalDateTime";
import Paragraph from "@/components/Paragraph";
import type { LearnerReviewCase } from "./page";

function badgeClass(status: LearnerReviewCase["status"]) {
  if (status === "PENDING") return "bg-amber-100 text-amber-900";
  if (status === "UPHELD") return "bg-green-100 text-green-900";
  return "bg-primary-100 text-primary-800";
}

export default function MarkingReviewsClient({
  reviews,
}: {
  reviews: LearnerReviewCase[] | null;
}) {
  return (
    <div className="mx-auto w-[90vw] max-w-4xl space-y-6 py-10">
      <div>
        <Heading1 gutter="sm">Marking reviews</Heading1>
        <Paragraph variant="muted" gutter="none">
          Track the status and decision for written-answer marks reported to
          Study Buddy support.
        </Paragraph>
      </div>

      {reviews === null ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
          We couldn&apos;t load your review cases. Sign in again or try later.
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-950">No review cases</h2>
          <p className="mt-2 leading-7 text-gray-600">
            If an AI-marked written answer looks wrong, open the completed mock
            exam and choose “Report this marking for review” on that question.
          </p>
          <Link
            href="/progress"
            className="mt-4 inline-flex min-h-11 items-center font-semibold text-primary-700 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
          >
            Open exam results
          </Link>
        </div>
      ) : (
        <ol className="space-y-4">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {review.reference}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-gray-950">
                    {review.paperTitle}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {review.subjectName} · {review.questionReference}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(review.status)}`}
                >
                  {review.statusLabel}
                </span>
              </div>

              <dl className="mt-4 grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-gray-500">Current mark</dt>
                  <dd className="mt-1 font-bold text-gray-950 tabular-nums">
                    {review.currentScore} / {review.maxScore}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500">Submitted</dt>
                  <dd className="mt-1 font-medium text-gray-800">
                    <LocalDateTime value={review.submittedAt} />
                  </dd>
                </div>
              </dl>

              {review.status === "MARK_ADJUSTED" ? (
                <p className="mt-3 font-semibold text-primary-800">
                  The mark changed from {review.originalScore} to{" "}
                  {review.revisedScore} / {review.maxScore}.
                </p>
              ) : null}
              {review.resolutionNote ? (
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
                  <span className="font-semibold text-gray-950">Decision:</span>{" "}
                  {review.resolutionNote}
                </p>
              ) : null}
              <Link
                href={review.examHref}
                className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary-700 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
              >
                Open the marked exam
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
