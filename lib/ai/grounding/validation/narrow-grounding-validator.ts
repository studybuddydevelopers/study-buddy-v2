import { z } from "zod";
import type { ValidatedEvidenceUnit } from "../evidence-units/validated-evidence-unit";
import { renderGroundedAnswerSegments } from "../structured-output";

const narrowAnswerSegmentSchema = z
  .object({
    text: z.string().trim().min(1).max(1200),
    sourceLabels: z.array(z.string().regex(/^SOURCE_[1-9][0-9]*$/)).max(8),
    evidenceUnitIds: z.array(z.string().min(1)).max(16).optional(),
  })
  .strict();

const narrowGroundedResponseSchema = z
  .object({
    answerSegments: z.array(narrowAnswerSegmentSchema).max(16),
    insufficientContext: z.boolean(),
    suggestedQuestions: z.array(z.string().trim().min(1).max(160)).max(3).optional(),
  })
  .strict();

export type NarrowGroundedAnswerSegment = z.infer<typeof narrowAnswerSegmentSchema>;

export type NarrowGroundedResponse = z.infer<typeof narrowGroundedResponseSchema> & {
  answer: string;
  citations: Array<{ sourceLabel: string; evidenceUnitIds: string[] }>;
};

export type NarrowGroundingValidationErrorCode =
  | "INVALID_SCHEMA"
  | "UNKNOWN_SOURCE_LABEL"
  | "UNKNOWN_EVIDENCE_UNIT"
  | "MISSING_SEGMENT_CITATION"
  | "UNAUTHORISED_EVIDENCE_UNIT"
  | "INVALID_ARITHMETIC"
  | "FORBIDDEN_CONTENT"
  | "DEBUG_CONTENT";

export type NarrowGroundingValidationResult = {
  supported: boolean;
  errors: Array<{
    code: NarrowGroundingValidationErrorCode;
    message: string;
    segmentIndex?: number;
  }>;
  response?: NarrowGroundedResponse;
};

export function validateNarrowGroundedOutput(input: {
  value: unknown;
  validatedEvidenceUnits: ValidatedEvidenceUnit[];
}): NarrowGroundingValidationResult {
  const parsed = narrowGroundedResponseSchema.safeParse(input.value);
  if (!parsed.success) {
    return failure("INVALID_SCHEMA", "Output did not match the grounded schema.");
  }

  const allowedLabels = new Set(input.validatedEvidenceUnits.map((unit) => unit.sourceLabel));
  const unitsById = new Map(input.validatedEvidenceUnits.map((unit) => [unit.id, unit]));
  const errors: NarrowGroundingValidationResult["errors"] = [];

  if (parsed.data.insufficientContext) {
    if (parsed.data.answerSegments.length > 0) {
      errors.push({
        code: "INVALID_SCHEMA",
        message: "Insufficient-context output must not include answer segments.",
      });
    }
  } else if (parsed.data.answerSegments.length === 0) {
    errors.push({
      code: "MISSING_SEGMENT_CITATION",
      message: "Supported output requires at least one cited segment.",
    });
  }

  const normalizedSegments: NarrowGroundedAnswerSegment[] = [];
  for (const [index, segment] of parsed.data.answerSegments.entries()) {
    const normalized = {
      text: normalizeText(segment.text),
      sourceLabels: uniqueStrings(segment.sourceLabels),
      evidenceUnitIds: uniqueStrings(segment.evidenceUnitIds ?? []),
    };
    normalizedSegments.push(normalized);

    if (normalized.sourceLabels.length === 0) {
      errors.push({
        code: "MISSING_SEGMENT_CITATION",
        message: "Educational answer segment requires a source label.",
        segmentIndex: index,
      });
    }

    for (const label of normalized.sourceLabels) {
      if (!allowedLabels.has(label)) {
        errors.push({
          code: "UNKNOWN_SOURCE_LABEL",
          message: "Unknown source label.",
          segmentIndex: index,
        });
      }
    }

    for (const unitId of normalized.evidenceUnitIds) {
      const unit = unitsById.get(unitId);
      if (!unit) {
        errors.push({
          code: "UNKNOWN_EVIDENCE_UNIT",
          message: "Unknown evidence unit.",
          segmentIndex: index,
        });
        continue;
      }
      if (!normalized.sourceLabels.includes(unit.sourceLabel)) {
        errors.push({
          code: "UNAUTHORISED_EVIDENCE_UNIT",
          message: "Evidence unit does not match the cited source label.",
          segmentIndex: index,
        });
      }
    }

    if (containsForbiddenContent(normalized.text)) {
      errors.push({
        code: "FORBIDDEN_CONTENT",
        message: "Output repeats prohibited instruction-like content.",
        segmentIndex: index,
      });
    }

    if (containsDebugContent(normalized.text)) {
      errors.push({
        code: "DEBUG_CONTENT",
        message: "Output contains system, provider, or debug-like content.",
        segmentIndex: index,
      });
    }

    if (!hasValidCitationReferencesInText(normalized.text, allowedLabels)) {
      errors.push({
        code: "UNKNOWN_SOURCE_LABEL",
        message: "Segment text contains an unknown or fake source marker.",
        segmentIndex: index,
      });
    }

    if (!validateArithmeticInSegment(normalized, input.validatedEvidenceUnits)) {
      errors.push({
        code: "INVALID_ARITHMETIC",
        message: "Arithmetic expression is invalid or unsupported by cited units.",
        segmentIndex: index,
      });
    }
  }

  if (errors.length > 0) {
    return { supported: false, errors };
  }

  const citations = uniqueStrings(
    normalizedSegments.flatMap((segment) => segment.sourceLabels)
  ).map((sourceLabel) => ({
    sourceLabel,
    evidenceUnitIds: uniqueStrings(
      normalizedSegments
        .filter((segment) => segment.sourceLabels.includes(sourceLabel))
        .flatMap((segment) => segment.evidenceUnitIds ?? [])
    ),
  }));

  return {
    supported: true,
    errors: [],
    response: {
      ...parsed.data,
      answerSegments: normalizedSegments,
      answer: renderGroundedAnswerSegments(normalizedSegments),
      citations,
      suggestedQuestions: parsed.data.suggestedQuestions?.slice(0, 3) ?? [],
    },
  };
}

function validateArithmeticInSegment(
  segment: NarrowGroundedAnswerSegment,
  units: ValidatedEvidenceUnit[]
): boolean {
  const arithmeticMatches = [...segment.text.matchAll(
    /([-+]?\d+(?:\.\d+)?)\s*([/+*×x÷-])\s*([-+]?\d+(?:\.\d+)?)\s*=\s*([-+]?\d+(?:\.\d+)?)/g
  )];
  if (arithmeticMatches.length === 0) return true;

  const citedUnits = units.filter(
    (unit) =>
      segment.sourceLabels.includes(unit.sourceLabel) ||
      (segment.evidenceUnitIds ?? []).includes(unit.id)
  );
  const citedEvidence = citedUnits.map((unit) => unit.quotedEvidence).join(" ");

  for (const match of arithmeticMatches) {
    const left = Number(match[1]);
    const operator = match[2] ?? "";
    const right = Number(match[3]);
    const result = Number(match[4]);
    if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(result)) {
      return false;
    }
    const leftText = match[1] ?? "";
    const rightText = match[3] ?? "";
    const resultText = match[4] ?? "";
    if (
      !numericTextSupportedByEvidence(leftText, citedEvidence) ||
      !numericTextSupportedByEvidence(rightText, citedEvidence)
    ) {
      return false;
    }
    const calculationEvidenceCanSupportStatedResult =
      citedUnits.some((unit) => unit.allowedUses.includes("CALCULATE")) &&
      numericTextSupportedByEvidence(resultText, citedEvidence);
    if (
      !operationPermittedByEvidence(operator, citedEvidence) &&
      !calculationEvidenceCanSupportStatedResult
    ) {
      return false;
    }

    const expected = calculate(left, operator, right);
    if (expected === undefined || Math.abs(expected - result) > 1e-9) return false;
  }

  return true;
}

function numericTextSupportedByEvidence(value: string, evidence: string) {
  if (!value) return false;
  if (new RegExp(`\\b${escapeRegExp(value)}\\b`).test(evidence)) return true;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return false;
  const percentValue = numeric * 100;
  if (percentValue > 0 && percentValue < 100) {
    const percentText = Number.isInteger(percentValue)
      ? String(percentValue)
      : String(percentValue).replace(/0+$/, "").replace(/\.$/, "");
    return new RegExp(`\\b${escapeRegExp(percentText)}\\s*(?:percent|%)\\b`, "i").test(
      evidence
    );
  }

  return false;
}

function operationPermittedByEvidence(operator: string, evidence: string) {
  if (operator === "/" || operator === "÷") return /[/÷]|\bper\b/i.test(evidence);
  if (operator === "*" || operator === "×" || operator.toLowerCase() === "x") {
    return /[*×]|\sx\s/i.test(evidence);
  }
  if (operator === "+") return /[+]/.test(evidence);
  if (operator === "-") return /[-]/.test(evidence);
  return false;
}

function calculate(left: number, operator: string, right: number) {
  if (operator === "/" || operator === "÷") return right === 0 ? undefined : left / right;
  if (operator === "*" || operator === "×" || operator.toLowerCase() === "x") {
    return left * right;
  }
  if (operator === "+") return left + right;
  if (operator === "-") return left - right;
  return undefined;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasValidCitationReferencesInText(text: string, allowedLabels: Set<string>) {
  const labels = [...text.matchAll(/\bSOURCE[_\s-]*([0-9]+)\b/gi)].map(
    (match) => `SOURCE_${match[1]}`
  );
  return labels.every((label) => allowedLabels.has(label));
}

function containsForbiddenContent(text: string) {
  return /\b(ignore\s+(?:all\s+)?source\s+limits|ignore\s+(?:previous|all)\s+instructions?|reveal\s+(?:the\s+)?system prompt|answer\s+from\s+memory|use\s+fake\s+source|cite\s+source[_\s-]*\d+)\b/i.test(
    text
  );
}

function containsDebugContent(text: string) {
  return /\b(system prompt|developer message|provider payload|raw response|api key|stack trace|debug dump)\b/i.test(
    text
  );
}

function failure(
  code: NarrowGroundingValidationErrorCode,
  message: string
): NarrowGroundingValidationResult {
  return {
    supported: false,
    errors: [{ code, message }],
  };
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
