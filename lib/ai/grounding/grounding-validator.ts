import { GROUNDING_VALIDATOR_VERSION } from "./config";
import type { GroundedTeachAnswerSegment } from "./structured-output";

export type GroundingValidationReason =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "UNSUPPORTED"
  | "INSUFFICIENT_EVIDENCE";

export interface GroundingValidatorInput {
  segment: string;
  citedEvidence: Array<{
    sourceLabel: string;
    excerpt: string;
  }>;
}

export interface GroundingValidatorResult {
  supported: boolean;
  reason: GroundingValidationReason;
  unsupportedTerms: string[];
  validatorVersion: string;
}

export interface GroundingValidator {
  validate(input: GroundingValidatorInput): Promise<GroundingValidatorResult>;
}

export interface SegmentGroundingValidation {
  index: number;
  text: string;
  sourceLabels: string[];
  supported: boolean;
  reason: GroundingValidationReason;
  unsupportedTerms: string[];
  validatorVersion: string;
}

const CLAIM_TERM_STOPWORDS = new Set([
  "about",
  "above",
  "also",
  "answer",
  "because",
  "being",
  "between",
  "called",
  "calculate",
  "calculated",
  "calculating",
  "concept",
  "define",
  "defined",
  "definition",
  "does",
  "each",
  "explain",
  "explains",
  "find",
  "found",
  "from",
  "give",
  "helps",
  "into",
  "means",
  "mentioned",
  "must",
  "note",
  "only",
  "question",
  "same",
  "show",
  "shows",
  "simple",
  "source",
  "state",
  "states",
  "step",
  "teach",
  "term",
  "terms",
  "that",
  "this",
  "through",
  "used",
  "uses",
  "using",
  "when",
  "where",
  "which",
  "with",
]);

const IMPORTANT_SHORT_TERMS = new Set([
  "pi",
  "x",
  "v",
  "i",
  "r",
  "f",
  "m",
  "a",
]);

const NUMBER_WORDS = new Map([
  ["0", "zero"],
  ["1", "one"],
  ["2", "two"],
  ["3", "three"],
  ["4", "four"],
  ["5", "five"],
  ["6", "six"],
  ["7", "seven"],
  ["8", "eight"],
  ["9", "nine"],
  ["10", "ten"],
  ["12", "twelve"],
  ["15", "fifteen"],
  ["20", "twenty"],
  ["25", "twenty five"],
  ["100", "one hundred"],
  ["400", "four hundred"],
  ["500", "five hundred"],
]);

export class DeterministicGroundingValidator implements GroundingValidator {
  async validate(
    input: GroundingValidatorInput
  ): Promise<GroundingValidatorResult> {
    if (input.citedEvidence.length === 0) {
      return result(false, "INSUFFICIENT_EVIDENCE", []);
    }

    const evidence = normalizeForMatching(
      input.citedEvidence.map((item) => item.excerpt).join(" ")
    );
    if (!evidence) return result(false, "INSUFFICIENT_EVIDENCE", []);

    const terms = extractClaimTerms(input.segment);
    const unsupportedTerms = terms.filter((term) => !termAppears(term, evidence));

    if (unsupportedTerms.length === 0) {
      return result(true, "SUPPORTED", []);
    }

    return result(
      false,
      unsupportedTerms.length === terms.length ? "UNSUPPORTED" : "PARTIALLY_SUPPORTED",
      unsupportedTerms
    );
  }
}

export async function validateGroundedAnswerSegments(input: {
  segments: GroundedTeachAnswerSegment[];
  evidenceByLabel: Map<string, { sourceLabel: string; excerpt: string }>;
  validator?: GroundingValidator;
}) {
  const validator = input.validator ?? new DeterministicGroundingValidator();
  const results: SegmentGroundingValidation[] = [];

  for (const [index, segment] of input.segments.entries()) {
    const citedEvidence = segment.sourceLabels
      .map((label) => input.evidenceByLabel.get(label))
      .filter(
        (item): item is { sourceLabel: string; excerpt: string } => item !== undefined
      );
    const validation = await validator.validate({
      segment: segment.text,
      citedEvidence,
    });
    results.push({
      index,
      text: segment.text,
      sourceLabels: segment.sourceLabels,
      supported: validation.supported,
      reason: validation.reason,
      unsupportedTerms: validation.unsupportedTerms,
      validatorVersion: validation.validatorVersion,
    });
  }

  return {
    supported: results.every((item) => item.supported),
    results,
  };
}

function result(
  supported: boolean,
  reason: GroundingValidationReason,
  unsupportedTerms: string[]
): GroundingValidatorResult {
  return {
    supported,
    reason,
    unsupportedTerms,
    validatorVersion: GROUNDING_VALIDATOR_VERSION,
  };
}

function extractClaimTerms(value: string) {
  const normalized = normalizeForMatching(value);
  const words = normalized.match(/[a-z0-9]+(?:\/[0-9]+)?/g) ?? [];
  return Array.from(
    new Set(
      words.filter((word) => {
        if (CLAIM_TERM_STOPWORDS.has(word)) return false;
        if (/^[0-9]+$/.test(word)) return true;
        return word.length >= 4 || IMPORTANT_SHORT_TERMS.has(word);
      })
    )
  );
}

function termAppears(term: string, evidence: string) {
  if (hasTerm(evidence, term)) return true;
  const numberWord = NUMBER_WORDS.get(term);
  if (numberWord && hasPhrase(evidence, numberWord)) return true;
  if (term === "1/2" && (hasPhrase(evidence, "one half") || hasTerm(evidence, "half"))) {
    return true;
  }
  if (term.endsWith("s") && hasTerm(evidence, term.slice(0, -1))) return true;
  if (hasTerm(evidence, `${term}s`)) return true;
  if (term.endsWith("y") && hasTerm(evidence, `${term.slice(0, -1)}ies`)) {
    return true;
  }
  if (term.endsWith("e") && hasTerm(evidence, `${term.slice(0, -1)}ing`)) {
    return true;
  }
  if (term.endsWith("ing") && hasTerm(evidence, term.slice(0, -3))) return true;
  return false;
}

function hasTerm(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

function hasPhrase(text: string, phrase: string) {
  return text.includes(normalizeForMatching(phrase));
}

function normalizeForMatching(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/×/g, " x ")
    .replace(/[^\p{L}\p{N}/]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
