import { z } from "zod";
import type { ValidatedEvidenceUnit } from "../evidence-units/validated-evidence-unit";
import type { RequestRequirement, RequestRequirements } from "../requirements/types";
import { renderGroundedAnswerSegments } from "../structured-output";

const narrowAnswerSegmentSchema = z
  .object({
    text: z.string().trim().min(1).max(1200),
    sourceLabels: z.array(z.string().regex(/^SOURCE_[1-9][0-9]*$/)).max(8),
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
  | "MISSING_SEGMENT_CITATION"
  | "MISSING_REQUIRED_TASK"
  | "UNSUPPORTED_ELABORATION"
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
  requestRequirements?: RequestRequirements;
}): NarrowGroundingValidationResult {
  const parsed = narrowGroundedResponseSchema.safeParse(input.value);
  if (!parsed.success) {
    return failure("INVALID_SCHEMA", "Output did not match the grounded schema.");
  }

  const allowedLabels = new Set(input.validatedEvidenceUnits.map((unit) => unit.sourceLabel));
  const requiredRequirementIds = uniqueStrings(
    input.validatedEvidenceUnits.flatMap((unit) => unit.supportsRequirementIds)
  );
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

    const citedUnits = unitsForSourceLabels(
      normalized.sourceLabels,
      input.validatedEvidenceUnits
    );
    const citedEvidence = citedUnits.map((unit) => unit.quotedEvidence).join(" ");

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

    if (containsUnsupportedClosedWorldElaboration(normalized.text, citedEvidence)) {
      errors.push({
        code: "UNSUPPORTED_ELABORATION",
        message: "Output adds a related fact that is not present in the cited evidence.",
        segmentIndex: index,
      });
    }

    if (containsNovelRelationClaim(normalized.text, citedUnits)) {
      errors.push({
        code: "UNSUPPORTED_ELABORATION",
        message: "Output introduces a relation or entity not present in the cited evidence.",
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

  if (!parsed.data.insufficientContext) {
    const coveredRequirementIds = uniqueStrings(
      normalizedSegments.flatMap((segment) =>
        unitsForSourceLabels(segment.sourceLabels, input.validatedEvidenceUnits).flatMap(
          (unit) => unit.supportsRequirementIds
        )
      )
    );
    for (const requirementId of requiredRequirementIds) {
      if (!coveredRequirementIds.includes(requirementId)) {
        errors.push({
          code: "MISSING_REQUIRED_TASK",
          message: "A required requested task was not covered by any answer segment.",
        });
      }
    }

    errors.push(
      ...validateBoundedTaskCompleteness({
        text: normalizedSegments.map((segment) => segment.text).join(" "),
        requestRequirements: input.requestRequirements,
        validatedEvidenceUnits: input.validatedEvidenceUnits,
      })
    );
  }

  if (errors.length > 0) {
    return { supported: false, errors };
  }

  const citations = uniqueStrings(
    normalizedSegments.flatMap((segment) => segment.sourceLabels)
  ).map((sourceLabel) => ({
    sourceLabel,
      evidenceUnitIds: uniqueStrings(
        input.validatedEvidenceUnits
          .filter((unit) => unit.sourceLabel === sourceLabel)
          .map((unit) => unit.id)
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
  const citedUnits = units.filter(
    (unit) => segment.sourceLabels.includes(unit.sourceLabel)
  );
  const citedEvidence = citedUnits.map((unit) => unit.quotedEvidence).join(" ");
  const arithmeticSteps = extractCalculationSteps(segment.text);
  const quantityAssignments = extractQuantityAssignments(segment.text);

  if (arithmeticSteps.length === 0 && containsUnresolvedAlgebra(segment.text)) {
    return true;
  }

  if (!quantityAssignmentsConsistent(quantityAssignments)) return false;

  const derivedValues: string[] = [];
  for (const step of arithmeticSteps) {
    if (!calculationStepSupported(step, citedUnits, citedEvidence, derivedValues)) {
      return false;
    }
    derivedValues.push(String(step.result));
  }

  for (const assignment of quantityAssignments) {
    if (
      !numericTextSupportedByEvidence(assignment.valueText, citedEvidence) &&
      !derivedValues.some((value) => numericValuesEqual(value, assignment.valueText))
    ) {
      return false;
    }
  }

  return true;
}

type CalculationStep = {
  id: string;
  expression: string;
  operands: number[];
  operation: string;
  result: number;
  resultText: string;
  supportedByEvidenceUnitIds: string[];
  derivedFromStepIds?: string[];
};

type QuantityAssignment = {
  quantity: string;
  value: number;
  valueText: string;
};

function extractCalculationSteps(text: string): CalculationStep[] {
  const steps: CalculationStep[] = [];
  const addStep = (
    expression: string,
    leftText: string | undefined,
    operator: string,
    rightText: string | undefined,
    resultText: string | undefined
  ) => {
    const left = Number(leftText);
    const right = Number(rightText);
    const result = Number(resultText);
    if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(result)) {
      return;
    }
    steps.push({
      id: `step-${steps.length + 1}`,
      expression: normalizeText(expression),
      operands: [left, right],
      operation: normalizeOperator(operator),
      result,
      resultText: resultText ?? String(result),
      supportedByEvidenceUnitIds: [],
    });
  };

  for (const match of text.matchAll(
    /([-+]?\d+(?:\.\d+)?)\s*([/+*×x÷-])\s*([-+]?\d+(?:\.\d+)?)\s*(?:=|equals?|is)\s*(?:approximately|about|around)?\s*([-+]?\d+(?:\.\d+)?)/gi
  )) {
    addStep(match[0] ?? "", match[1], match[2] ?? "", match[3], match[4]);
  }

  for (const match of text.matchAll(
    /([-+]?\d+(?:\.\d+)?)\s*(?:\w+\s+){0,3}divided\s+by\s+([-+]?\d+(?:\.\d+)?)(?:\s+\w+){0,4}\s+(?:equals?|is)\s*(?:approximately|about|around)?\s*([-+]?\d+(?:\.\d+)?)/gi
  )) {
    addStep(match[0] ?? "", match[1], "/", match[2], match[3]);
  }

  for (const match of text.matchAll(
    /([-+]?\d+(?:\.\d+)?)\s*(?:percent|%)\s+of\s+([-+]?\d+(?:\.\d+)?)\s*(?:is|=|equals?)\s*(?:approximately|about|around)?\s*([-+]?\d+(?:\.\d+)?)/gi
  )) {
    addStep(match[0] ?? "", match[1], "percent-of", match[2], match[3]);
  }

  return steps;
}

function calculationStepSupported(
  step: CalculationStep,
  citedUnits: ValidatedEvidenceUnit[],
  citedEvidence: string,
  derivedValues: string[]
) {
  const [left, right] = step.operands;
  const leftText = numberToComparableText(left);
  const rightText = numberToComparableText(right);
  const operandsSupported = [leftText, rightText].every((value) =>
    numericTextSupportedByEvidence(value, citedEvidence) ||
    derivedValues.some((derived) => numericValuesEqual(derived, value))
  );
  if (!operandsSupported) return false;

  const expected = calculate(left, step.operation, right);
  if (expected === undefined || !numbersClose(expected, step.result)) return false;

  const resultSupported = numericTextSupportedByEvidence(step.resultText, citedEvidence);
  const hasCalculationEvidence = citedUnits.some((unit) =>
    unit.allowedUses.includes("CALCULATE")
  );
  if (resultSupported && hasCalculationEvidence) return true;

  return operationPermittedByEvidence(step.operation, citedEvidence);
}

function extractQuantityAssignments(text: string): QuantityAssignment[] {
  const assignments: QuantityAssignment[] = [];
  for (const match of text.matchAll(
    /\b([A-Za-z][A-Za-z\s-]{1,36}?)\b(?:\s+(?:is|equals?)|(?:\s+[^.]{0,24}?\s+equals?))\s+(?:approximately|about|around)?\s*([-+]?\d+(?:\.\d+)?)/gi
  )) {
    const quantity = normalizeQuantityLabel(match[1] ?? "");
    const valueText = match[2] ?? "";
    const value = Number(valueText);
    if (!quantity || !Number.isFinite(value)) continue;
    assignments.push({ quantity, value, valueText });
  }
  return assignments;
}

function quantityAssignmentsConsistent(assignments: QuantityAssignment[]) {
  const seen = new Map<string, number>();
  for (const assignment of assignments) {
    const previous = seen.get(assignment.quantity);
    if (previous !== undefined && !numbersClose(previous, assignment.value)) {
      return false;
    }
    seen.set(assignment.quantity, assignment.value);
  }
  return true;
}

function validateBoundedTaskCompleteness(input: {
  text: string;
  requestRequirements?: RequestRequirements;
  validatedEvidenceUnits: ValidatedEvidenceUnit[];
}): NarrowGroundingValidationResult["errors"] {
  if (!input.requestRequirements) return [];

  const text = normalizeForCompleteness(input.text);
  const errors: NarrowGroundingValidationResult["errors"] = [];
  for (const requirement of flattenRequirements(input.requestRequirements.requirements)) {
    const units = input.validatedEvidenceUnits.filter((unit) =>
      unit.supportsRequirementIds.includes(requirement.id)
    );
    if (units.length === 0) continue;

    if (isExplanationContextRequirement(requirement)) {
      const missing = requiredNumericContextPhrases(units).filter(
        (phrase) => !phrasePresent(text, phrase)
      );
      if (missing.length > 0) {
        errors.push({
          code: "MISSING_REQUIRED_TASK",
          message: `Explanation output omitted required supporting context: ${missing.join(", ")}.`,
        });
      }
    }

    if (isVariableDefinitionRequirement(requirement)) {
      const missing = requiredVariableDefinitionTerms(units).filter(
        (terms) => !terms.every((term) => phrasePresent(text, term))
      );
      if (missing.length > 0) {
        errors.push({
          code: "MISSING_REQUIRED_TASK",
          message: "Formula-variable output omitted an explicit requested variable definition.",
        });
      }
    }
  }
  return errors;
}

function flattenRequirements(requirements: RequestRequirement[]): RequestRequirement[] {
  return requirements.flatMap((requirement) => [
    requirement,
    ...flattenRequirements(requirement.childRequirements ?? []),
  ]);
}

function isExplanationContextRequirement(requirement: RequestRequirement) {
  return (
    (requirement.constraints ?? []).includes("explanation context") ||
    /\b(?:supporting\s+context|explanation\s+context|reasoning)\b/i.test(
      requirement.requestedFact ?? ""
    )
  );
}

function isVariableDefinitionRequirement(requirement: RequestRequirement) {
  return (
    requirement.requestedAction === "DEFINE_VARIABLES" ||
    /\bvariables?\b/i.test(requirement.requestedFact ?? "") ||
    requirement.kind === "FORMULA_WITH_SYMBOLS" ||
    requirement.kind === "SYMBOL_DEFINITION"
  );
}

function requiredNumericContextPhrases(units: ValidatedEvidenceUnit[]): string[] {
  return uniqueStrings(
    units.flatMap((unit) => {
      const phrases = [...unit.quotedEvidence.matchAll(
        /\b(\d+(?:\.\d+)?)\s+([A-Za-z][A-Za-z-]*)/g
      )].map((match) => `${match[1]} ${match[2]}`);
      return phrases.length > 0
        ? phrases
        : [...unit.quotedEvidence.matchAll(/\b\d+(?:\.\d+)?\b/g)].map(
            (match) => match[0]
          );
    })
  );
}

function requiredVariableDefinitionTerms(units: ValidatedEvidenceUnit[]): string[][] {
  const groups: string[][] = [];
  for (const unit of units) {
    for (const component of unit.semanticComponents ?? []) {
      if (component.kind !== "SYMBOL" || !component.symbol) continue;
      const meaning =
        component.concept?.aliases?.[0] ??
        component.text?.replace(new RegExp(`\\b${escapeRegExp(component.symbol)}\\b`, "i"), "") ??
        "";
      const cleanedMeaning = normalizeDefinitionTerm(meaning);
      if (cleanedMeaning) groups.push([component.symbol, cleanedMeaning]);
    }

    for (const match of unit.quotedEvidence.matchAll(
      /\b([A-Za-z])\s*(?:means|represents|is)\s+([A-Za-z][A-Za-z\s-]{1,36}?)(?=,|\band\s+[A-Za-z]\s+(?:means|represents|is)\b|\.|$)/gi
    )) {
      const meaning = normalizeDefinitionTerm(match[2] ?? "");
      if (match[1] && meaning) groups.push([match[1], meaning]);
    }
  }

  const combined = units.map((unit) => unit.quotedEvidence).join(" ");
  const wordVariables = [
    "perpendicular height",
    "vertical height",
    "base",
    "height",
    "mass",
    "acceleration",
    "force",
    "pressure",
    "current",
    "resistance",
    "voltage",
  ]
    .filter((term) => phrasePresent(normalizeForCompleteness(combined), term));
  return uniqueTermGroups([...groups, ...wordVariables.map((term) => [term])]);
}

function unitsForSourceLabels(
  sourceLabels: string[],
  units: ValidatedEvidenceUnit[]
): ValidatedEvidenceUnit[] {
  return units.filter((unit) => sourceLabels.includes(unit.sourceLabel));
}

function containsUnsupportedClosedWorldElaboration(text: string, citedEvidence: string) {
  if (!/\b(?:directly|inversely)?\s*proportional(?:ity)?\b/i.test(text)) {
    return false;
  }

  return !/\bproportional(?:ity)?\b/i.test(citedEvidence);
}

function containsNovelRelationClaim(text: string, citedUnits: ValidatedEvidenceUnit[]) {
  const evidenceText = citedUnits
    .map((unit) =>
      [
        unit.quotedEvidence,
        ...(unit.semanticComponents ?? []).map((component) =>
          [
            component.text,
            component.relation,
            component.object,
            component.concept?.aliases?.join(" "),
          ].filter(Boolean).join(" ")
        ),
      ].join(" ")
    )
    .join(" ")
    .toLowerCase();
  const generated = text.toLowerCase();
  const relationPhrases = [
    ...generated.matchAll(/\b(?:opposite|adjacent|bottom|top|upper|lower|nearby|parallel|perpendicular)\s+[a-z]{3,}\b/g),
  ].map((match) => match[0]);
  return relationPhrases.some((phrase) => !evidenceText.includes(phrase));
}

function containsUnresolvedAlgebra(text: string) {
  return /(?:^|[^A-Za-z])(?:[a-zA-Z])\s*[+\-*/×÷=]|[+\-*/×÷=]\s*(?:[a-zA-Z])(?:[^A-Za-z]|$)/.test(
    text
  );
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
  if (operator === "percent-of") return /\b(?:percent|%)\b/i.test(evidence);
  if (operator === "*" || operator === "×" || operator.toLowerCase() === "x") {
    return /[*×]|\sx\s/i.test(evidence);
  }
  if (operator === "+") return /[+]/.test(evidence);
  if (operator === "-") return /[-]/.test(evidence);
  return false;
}

function calculate(left: number, operator: string, right: number) {
  if (operator === "/" || operator === "÷") return right === 0 ? undefined : left / right;
  if (operator === "percent-of") return (left / 100) * right;
  if (operator === "*" || operator === "×" || operator.toLowerCase() === "x") {
    return left * right;
  }
  if (operator === "+") return left + right;
  if (operator === "-") return left - right;
  return undefined;
}

function normalizeOperator(operator: string) {
  if (operator === "÷") return "/";
  if (operator === "×" || operator.toLowerCase() === "x") return "*";
  return operator;
}

function numberToComparableText(value: number) {
  return Number.isInteger(value) ? String(value) : String(value);
}

function numericValuesEqual(left: string, right: string) {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  return (
    Number.isFinite(leftNumber) &&
    Number.isFinite(rightNumber) &&
    numbersClose(leftNumber, rightNumber)
  );
}

function numbersClose(left: number, right: number) {
  return Math.abs(left - right) <= 0.01;
}

function normalizeQuantityLabel(value: string) {
  return normalizeForCompleteness(value)
    .replace(/\b(?:the|a|an|we|can|find|calculate|value|of|for|as|follows|since|total|parts?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForCompleteness(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9.%/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDefinitionTerm(value: string) {
  return normalizeForCompleteness(value)
    .replace(/\b(?:and|or|the|a|an|in|the formula|formula)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phrasePresent(normalizedTextValue: string, phrase: string) {
  const normalizedPhrase = normalizeForCompleteness(phrase);
  if (!normalizedPhrase) return true;
  return normalizedTextValue.includes(normalizedPhrase);
}

function uniqueTermGroups(groups: string[][]) {
  const seen = new Set<string>();
  const result: string[][] = [];
  for (const group of groups) {
    const normalized = uniqueStrings(group.map(normalizeDefinitionTerm).filter(Boolean));
    if (normalized.length === 0) continue;
    const key = normalized.join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
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
