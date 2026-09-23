"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/Button";
import Heading1 from "@/components/Heading1";
import LocalDateTime from "@/components/LocalDateTime";

type QueueFilter = "PENDING" | "RESOLVED" | "ALL";

interface ReviewEvent {
  id: string;
  eventType: "SUBMITTED" | "UPHELD" | "MARK_ADJUSTED";
  actorType: "LEARNER" | "SUPPORT";
  previousScore: number | null;
  newScore: number | null;
  note: string | null;
  createdAt: string;
}

interface SupportReviewCase {
  id: string;
  reference: string;
  status: "PENDING" | "UPHELD" | "MARK_ADJUSTED";
  statusLabel: string;
  learnerName: string;
  paperTitle: string;
  subjectName: string;
  questionReference: string;
  questionText: string;
  learnerAnswer: string;
  modelAnswer: string;
  markingGuide: string;
  aiRationale: string;
  learnerReason: string;
  originalScore: number;
  revisedScore: number | null;
  currentScore: number;
  maxScore: number;
  resolutionNote: string | null;
  submittedAt: string;
  resolvedAt: string | null;
  events: ReviewEvent[];
}

function ReviewCard({
  review,
  onResolved,
}: {
  review: SupportReviewCase;
  onResolved: () => Promise<void>;
}) {
  const [score, setScore] = useState(String(review.currentScore));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(decision: "UPHOLD" | "ADJUST") {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/support/marking-reviews/${review.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            note,
            ...(decision === "ADJUST" ? { score: Number(score) } : {}),
          }),
        }
      );
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(body?.error ?? "The review could not be resolved.");
        return;
      }
      await onResolved();
    } catch {
      setError("The review could not be resolved. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
            {review.reference}
          </p>
          <h2 className="mt-1 text-xl font-bold text-gray-950">
            {review.paperTitle}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {review.learnerName} · {review.subjectName} ·{" "}
            {review.questionReference}
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
          {review.statusLabel}
        </span>
      </div>

      <p className="mt-3 text-sm text-gray-600">
        Submitted <LocalDateTime value={review.submittedAt} />
      </p>

      <dl className="mt-5 grid gap-3 lg:grid-cols-2">
        {[
          ["Question", review.questionText],
          ["Learner answer", review.learnerAnswer],
          ["Model answer", review.modelAnswer],
          ["Marking guide", review.markingGuide],
          ["AI rationale", review.aiRationale],
          ["Why the learner reported it", review.learnerReason],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-gray-50 p-4">
            <dt className="text-sm font-bold text-gray-950">{label}</dt>
            <dd className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 rounded-xl border border-primary-200 bg-primary-50 p-4">
        <p className="font-bold text-primary-900">
          AI mark: {review.originalScore} / {review.maxScore}
        </p>
        {review.status === "PENDING" ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <div>
                <label
                  htmlFor={`resolution-note-${review.id}`}
                  className="text-sm font-semibold text-gray-950"
                >
                  Decision note
                </label>
                <textarea
                  id={`resolution-note-${review.id}`}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  minLength={5}
                  maxLength={2000}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-base text-gray-950 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  placeholder="Explain the decision to the learner."
                />
              </div>
              <div>
                <label
                  htmlFor={`revised-score-${review.id}`}
                  className="text-sm font-semibold text-gray-950"
                >
                  Revised mark
                </label>
                <input
                  id={`revised-score-${review.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={review.maxScore}
                  step={1}
                  value={score}
                  onChange={(event) => setScore(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-950 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
                <p className="mt-1 text-xs text-gray-600">
                  0–{review.maxScore} marks
                </p>
              </div>
            </div>
            {error ? (
              <p role="alert" className="text-sm font-semibold text-red-700">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="success"
                onClick={() => void resolve("UPHOLD")}
                disabled={submitting}
                loading={submitting}
              >
                Approve original mark
              </Button>
              <Button
                variant="primary"
                onClick={() => void resolve("ADJUST")}
                disabled={submitting}
              >
                Change mark
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-gray-800">
            <p className="font-semibold">
              Current mark: {review.currentScore} / {review.maxScore}
            </p>
            <p className="mt-1 whitespace-pre-line">{review.resolutionNote}</p>
          </div>
        )}
      </div>

      <details className="mt-4 rounded-xl border border-gray-200 p-4">
        <summary className="cursor-pointer font-semibold text-gray-950">
          Audit trail ({review.events.length})
        </summary>
        <ol className="mt-3 space-y-3 border-l-2 border-primary-200 pl-4">
          {review.events.map((event) => (
            <li key={event.id} className="text-sm text-gray-700">
              <p className="font-semibold text-gray-950">
                {event.eventType.replaceAll("_", " ")} · {event.actorType.toLowerCase()}
              </p>
              <p>
                <LocalDateTime value={event.createdAt} /> ·{" "}
                {event.previousScore ?? "—"} → {event.newScore ?? "—"}
              </p>
              {event.note ? <p className="mt-1 whitespace-pre-line">{event.note}</p> : null}
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}

export default function MarkingReviewQueueClient() {
  const [filter, setFilter] = useState<QueueFilter>("PENDING");
  const [reviews, setReviews] = useState<SupportReviewCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/support/marking-reviews?status=${filter}`,
        { cache: "no-store" }
      );
      const body = (await response.json().catch(() => null)) as {
        reviews?: SupportReviewCase[];
        error?: string;
      } | null;
      if (!response.ok || !body?.reviews) {
        setError(body?.error ?? "The review queue could not be loaded.");
        return;
      }
      setReviews(body.reviews);
    } catch {
      setError("The review queue could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadReviews(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadReviews]);

  return (
    <div className="mx-auto w-[90vw] max-w-6xl space-y-6 py-10">
      <div>
        <Heading1 gutter="sm">Marking review queue</Heading1>
        <p className="max-w-3xl leading-7 text-gray-600">
          Review the original evidence, uphold the AI mark or enter a revised
          mark. Every decision is added to the case audit trail.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Filter review cases">
        {(["PENDING", "RESOLVED", "ALL"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            aria-pressed={filter === option}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 ${
              filter === option
                ? "bg-primary-600 text-white"
                : "border border-gray-300 bg-white text-gray-800 hover:border-primary-300"
            }`}
          >
            {option === "PENDING"
              ? "Pending"
              : option === "RESOLVED"
                ? "Resolved"
                : "All"}
          </button>
        ))}
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
          {error}
        </div>
      ) : null}
      {loading ? <p className="text-gray-600">Loading review cases…</p> : null}
      {!loading && !error && reviews.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-700 shadow-sm">
          There are no {filter === "ALL" ? "" : filter.toLowerCase()} review
          cases in this queue.
        </div>
      ) : null}
      {!loading && !error ? (
        <div className="space-y-5">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onResolved={loadReviews}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
