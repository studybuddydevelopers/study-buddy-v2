import type { MarkingReviewStatus } from "@prisma/client";

export const MARKING_REVIEW_REASON_MIN_LENGTH = 10;
export const MARKING_REVIEW_REASON_MAX_LENGTH = 2_000;
export const MARKING_REVIEW_NOTE_MIN_LENGTH = 5;
export const MARKING_REVIEW_NOTE_MAX_LENGTH = 2_000;

export type MarkingReviewDecision = "UPHOLD" | "ADJUST";

export function createMarkingReviewReference(id: string, date = new Date()) {
  const compactDate = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = id.replaceAll("-", "").slice(0, 12).toUpperCase();
  return `SBMR-${compactDate}-${suffix}`;
}

export function validateMarkingReviewReason(value: unknown) {
  const reason = typeof value === "string" ? value.trim() : "";
  if (reason.length < MARKING_REVIEW_REASON_MIN_LENGTH) {
    return {
      ok: false as const,
      error: `Explain the issue in at least ${MARKING_REVIEW_REASON_MIN_LENGTH} characters.`,
    };
  }
  if (reason.length > MARKING_REVIEW_REASON_MAX_LENGTH) {
    return {
      ok: false as const,
      error: `Keep the explanation under ${MARKING_REVIEW_REASON_MAX_LENGTH.toLocaleString()} characters.`,
    };
  }
  return { ok: true as const, reason };
}

export function validateMarkingReviewResolution(input: {
  decision: unknown;
  score: unknown;
  note: unknown;
  currentScore: number;
  maxScore: number;
}) {
  if (input.decision !== "UPHOLD" && input.decision !== "ADJUST") {
    return { ok: false as const, error: "Choose a valid review decision." };
  }

  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length < MARKING_REVIEW_NOTE_MIN_LENGTH) {
    return {
      ok: false as const,
      error: `Add a decision note of at least ${MARKING_REVIEW_NOTE_MIN_LENGTH} characters.`,
    };
  }
  if (note.length > MARKING_REVIEW_NOTE_MAX_LENGTH) {
    return {
      ok: false as const,
      error: `Keep the decision note under ${MARKING_REVIEW_NOTE_MAX_LENGTH.toLocaleString()} characters.`,
    };
  }

  if (input.decision === "UPHOLD") {
    return {
      ok: true as const,
      decision: input.decision,
      note,
      score: input.currentScore,
    };
  }

  if (
    typeof input.score !== "number" ||
    !Number.isInteger(input.score) ||
    input.score < 0 ||
    input.score > input.maxScore
  ) {
    return {
      ok: false as const,
      error: `The revised mark must be a whole number from 0 to ${input.maxScore}.`,
    };
  }
  if (input.score === input.currentScore) {
    return {
      ok: false as const,
      error: "Use approve original mark when the score is unchanged.",
    };
  }

  return {
    ok: true as const,
    decision: input.decision,
    note,
    score: input.score,
  };
}

export function markingReviewStatusLabel(status: MarkingReviewStatus) {
  switch (status) {
    case "PENDING":
      return "Pending review";
    case "UPHELD":
      return "Original mark approved";
    case "MARK_ADJUSTED":
      return "Mark changed";
  }
}

export function calculateScorePercentage(totalScore: number, totalMarks: number) {
  if (!Number.isFinite(totalMarks) || totalMarks <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((totalScore / totalMarks) * 100)));
}
