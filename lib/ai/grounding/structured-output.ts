import { z } from "zod";
import type { LabeledEvidence } from "./evidence";

export const groundedTeachResponseSchema = z
  .object({
    answer: z.string().trim().min(1).max(5000),
    citations: z
      .array(
        z
          .object({
            sourceLabel: z.string().regex(/^SOURCE_[1-9][0-9]*$/),
          })
          .strict()
      )
      .max(8),
    insufficientContext: z.boolean(),
    suggestedQuestions: z.array(z.string().trim().min(1).max(160)).max(3).optional(),
  })
  .strict();

export type GroundedTeachResponse = z.infer<typeof groundedTeachResponseSchema>;

export class GroundedOutputValidationError extends Error {
  constructor(message = "Invalid grounded model output.") {
    super(message);
    this.name = "GroundedOutputValidationError";
  }
}

export function validateGroundedTeachOutput(
  value: unknown,
  evidence: LabeledEvidence[]
) {
  const parsed = groundedTeachResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw new GroundedOutputValidationError();
  }

  const allowedLabels = new Set(evidence.map((item) => item.sourceLabel));
  const citationLabelList = parsed.data.citations.map((item) => item.sourceLabel);
  const citationLabels = new Set(citationLabelList);
  const markerLabels = new Set(extractCitationMarkers(parsed.data.answer));

  if (citationLabels.size !== citationLabelList.length) {
    throw new GroundedOutputValidationError("Duplicate citation labels.");
  }
  if (/\[(SOURCE_[1-9][0-9]*)\]\([^)]+\)/.test(parsed.data.answer)) {
    throw new GroundedOutputValidationError("Citation labels must not be links.");
  }
  if (/https?:\/\//i.test(parsed.data.answer)) {
    throw new GroundedOutputValidationError("Model-generated links are not citations.");
  }

  for (const label of citationLabels) {
    if (!allowedLabels.has(label)) {
      throw new GroundedOutputValidationError("Unknown citation label.");
    }
  }
  for (const label of markerLabels) {
    if (!allowedLabels.has(label)) {
      throw new GroundedOutputValidationError("Unknown citation marker.");
    }
  }

  if (!parsed.data.insufficientContext) {
    if (citationLabels.size === 0) {
      throw new GroundedOutputValidationError("Supported answers require citations.");
    }
    if (!setsEqual(citationLabels, markerLabels)) {
      throw new GroundedOutputValidationError("Citation markers and objects differ.");
    }
  } else if (citationLabels.size > 0 || markerLabels.size > 0) {
    throw new GroundedOutputValidationError("Insufficient-context output must not cite sources.");
  } else if (!isSafeInsufficientContextAnswer(parsed.data.answer)) {
    throw new GroundedOutputValidationError(
      "Insufficient-context output must not include unsupported factual detail."
    );
  }

  return {
    ...parsed.data,
    citations: Array.from(citationLabels).map((sourceLabel) => ({ sourceLabel })),
    suggestedQuestions: parsed.data.suggestedQuestions?.slice(0, 3) ?? [],
  };
}

export function extractCitationMarkers(answer: string) {
  return Array.from(answer.matchAll(/\[(SOURCE_[1-9][0-9]*)\]/g)).map(
    (match) => match[1]
  );
}

function setsEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function isSafeInsufficientContextAnswer(answer: string) {
  const normalized = answer.toLowerCase();
  return (
    normalized.includes("not enough") ||
    normalized.includes("insufficient") ||
    normalized.includes("approved studybuddy") ||
    normalized.includes("do not have enough")
  );
}
