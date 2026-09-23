"use client";

import Link from "next/link";
import { useState } from "react";
import Button from "@/components/Button";
import LocalDateTime from "@/components/LocalDateTime";

export interface LearnerMarkingReview {
  id: string;
  reference: string;
  status: "PENDING" | "UPHELD" | "MARK_ADJUSTED";
  originalScore: number;
  revisedScore: number | null;
  maxScore: number;
  resolutionNote: string | null;
  submittedAt: string;
  resolvedAt: string | null;
}

function statusLabel(status: LearnerMarkingReview["status"]) {
  if (status === "PENDING") return "Pending review";
  if (status === "UPHELD") return "Original mark approved";
  return "Mark changed";
}

function statusStyle(status: LearnerMarkingReview["status"]) {
  if (status === "PENDING") return "bg-amber-100 text-amber-900";
  if (status === "UPHELD") return "bg-green-100 text-green-900";
  return "bg-primary-100 text-primary-800";
}

export default function MarkingReviewPanel({
  answerId,
  existingReview,
}: {
  answerId: string;
  existingReview: LearnerMarkingReview | null;
}) {
  const [review, setReview] = useState(existingReview);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/mock-exams/marking-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answerId, reason }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        review?: LearnerMarkingReview;
      } | null;

      if ((!response.ok && response.status !== 409) || !body?.review) {
        setError(body?.error ?? "The review case could not be created.");
        return;
      }
      setReview(body.review);
      setOpen(false);
      setReason("");
    } catch {
      setError("The review case could not be created. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (review) {
    return (
      <div className="rounded-xl border border-primary-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Review case
            </p>
            <p className="mt-1 font-bold text-gray-950 tabular-nums">
              {review.reference}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(review.status)}`}
          >
            {statusLabel(review.status)}
          </span>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          Submitted <LocalDateTime value={review.submittedAt} />
        </p>
        {review.status === "MARK_ADJUSTED" ? (
          <p className="mt-2 font-semibold text-primary-800">
            Mark revised from {review.originalScore} to {review.revisedScore} /{" "}
            {review.maxScore}.
          </p>
        ) : null}
        {review.status === "UPHELD" ? (
          <p className="mt-2 font-semibold text-green-800">
            The original mark of {review.originalScore} / {review.maxScore} was
            approved.
          </p>
        ) : null}
        {review.resolutionNote ? (
          <p className="mt-2 whitespace-pre-line text-sm text-gray-800">
            <span className="font-semibold">Support decision:</span>{" "}
            {review.resolutionNote}
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-700">
            Study Buddy support will review the attached answer and marking
            evidence. The status will update here.
          </p>
        )}
        <Link
          href="/marking-reviews"
          className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary-700 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
        >
          View all marking reviews
        </Link>
      </div>
    );
  }

  if (!open) {
    return (
      <div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Report this marking for review
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submitReview}
      className="rounded-xl border border-primary-200 bg-white p-4"
    >
      <label htmlFor={`review-reason-${answerId}`} className="font-semibold text-gray-950">
        Why should this mark be reviewed?
      </label>
      <p className="mt-1 text-sm leading-6 text-gray-600">
        The exam, question, your answer, marking guide, AI rationale and awarded
        mark are attached automatically.
      </p>
      <textarea
        id={`review-reason-${answerId}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        minLength={10}
        maxLength={2000}
        required
        rows={4}
        className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-base text-gray-950 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300"
        placeholder="Explain what appears incorrect about the mark or rationale."
      />
      <p className="mt-1 text-right text-xs text-gray-500 tabular-nums">
        {reason.length} / 2,000
      </p>
      {error ? (
        <p className="mt-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-3">
        <Button type="submit" loading={submitting} disabled={submitting}>
          Create review case
        </Button>
        <Button
          variant="neutral"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
