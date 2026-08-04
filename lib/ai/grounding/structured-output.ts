import { z } from "zod";
import type { LabeledEvidence } from "./evidence";

const answerSegmentSchema = z
  .object({
    text: z.string().trim().min(1).max(1200),
    sourceLabels: z
      .array(z.string().regex(/^SOURCE_[1-9][0-9]*$/))
      .max(8),
  })
  .strict();

export const groundedTeachResponseSchema = z
  .object({
    answerSegments: z.array(answerSegmentSchema).max(16),
    insufficientContext: z.boolean(),
    suggestedQuestions: z.array(z.string().trim().min(1).max(160)).max(3).optional(),
  })
  .strict();

export type GroundedTeachAnswerSegment = z.infer<typeof answerSegmentSchema>;
export type GroundedTeachResponse = z.infer<typeof groundedTeachResponseSchema> & {
  answer: string;
  citations: Array<{ sourceLabel: string }>;
};

export class GroundedOutputValidationError extends Error {
  constructor(message = "Invalid grounded model output.") {
    super(message);
    this.name = "GroundedOutputValidationError";
  }
}

export function validateGroundedTeachOutput(
  value: unknown,
  evidence: LabeledEvidence[]
): GroundedTeachResponse {
  const parsed = groundedTeachResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw new GroundedOutputValidationError();
  }

  const allowedLabels = new Set(evidence.map((item) => item.sourceLabel));
  const answerSegments = parsed.data.answerSegments.map((segment) => ({
    text: normalizeSegmentText(segment.text),
    sourceLabels: uniqueLabels(segment.sourceLabels),
  }));

  for (const segment of answerSegments) {
    if (!segment.text) {
      throw new GroundedOutputValidationError("Empty answer segment.");
    }
    if (/\[(SOURCE_[1-9][0-9]*)\]/.test(segment.text)) {
      throw new GroundedOutputValidationError(
        "Answer segment text must not embed source markers."
      );
    }
    if (/\[(SOURCE_[1-9][0-9]*)\]\([^)]+\)/.test(segment.text)) {
      throw new GroundedOutputValidationError("Citation labels must not be links.");
    }
    if (/https?:\/\//i.test(segment.text)) {
      throw new GroundedOutputValidationError("Model-generated links are not citations.");
    }
    for (const label of segment.sourceLabels) {
      if (!allowedLabels.has(label)) {
        throw new GroundedOutputValidationError("Unknown segment source label.");
      }
    }
  }

  if (parsed.data.insufficientContext) {
    if (answerSegments.length > 0) {
      throw new GroundedOutputValidationError(
        "Insufficient-context output must not include answer segments."
      );
    }
    return {
      ...parsed.data,
      answerSegments: [],
      answer: "",
      citations: [],
      suggestedQuestions: parsed.data.suggestedQuestions?.slice(0, 3) ?? [],
    };
  }

  if (answerSegments.length === 0) {
    throw new GroundedOutputValidationError("Supported answers require answer segments.");
  }

  for (const segment of answerSegments) {
    if (segment.sourceLabels.length === 0) {
      throw new GroundedOutputValidationError(
        "Educational answer segments require source labels."
      );
    }
  }

  const answer = renderGroundedAnswerSegments(answerSegments);
  if (answer.length > 5000) {
    throw new GroundedOutputValidationError("Rendered answer is too long.");
  }

  const citationLabels = uniqueLabels(
    answerSegments.flatMap((segment) => segment.sourceLabels)
  );

  return {
    ...parsed.data,
    answerSegments,
    answer,
    citations: citationLabels.map((sourceLabel) => ({ sourceLabel })),
    suggestedQuestions: parsed.data.suggestedQuestions?.slice(0, 3) ?? [],
  };
}

export function renderGroundedAnswerSegments(
  segments: GroundedTeachAnswerSegment[]
) {
  return segments
    .map((segment) => {
      const labels = uniqueLabels(segment.sourceLabels)
        .map((label) => `[${label}]`)
        .join(" ");
      return [normalizeSegmentText(segment.text), labels].filter(Boolean).join(" ");
    })
    .join("\n\n")
    .trim();
}

export function extractCitationMarkers(answer: string) {
  return Array.from(answer.matchAll(/\[(SOURCE_[1-9][0-9]*)\]/g)).map(
    (match) => match[1]
  );
}

function normalizeSegmentText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function uniqueLabels(labels: string[]) {
  return Array.from(new Set(labels));
}
