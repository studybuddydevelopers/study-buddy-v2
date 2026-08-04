import { GROUNDING_VALIDATOR_VERSION } from "./config";
import type { GroundedTeachAnswerSegment } from "./structured-output";

export type GroundingValidationReason =
  | "SUPPORTED"
  | "SUPPORTED_WITH_CONNECTIVE_LANGUAGE"
  | "MISSING_SYMBOL_DEFINITION"
  | "UNSUPPORTED_ENTITY"
  | "UNSUPPORTED_RELATION"
  | "UNSUPPORTED_MECHANISM"
  | "UNSUPPORTED_CONTEXT"
  | "PARTIALLY_SUPPORTED"
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
  unsupportedClaim?: string;
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
  unsupportedClaim?: string;
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
  "here",
  "into",
  "means",
  "mentioned",
  "must",
  "note",
  "only",
  "other",
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
  "word",
  "words",
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

const LOW_RISK_CONNECTIVE_TERMS = new Set([
  "formula",
  "formulas",
  "represent",
  "represents",
  "represented",
  "representing",
]);

const UNSUPPORTED_MECHANISM_TERMS = new Set([
  "cause",
  "causes",
  "circulation",
  "consequence",
  "consequences",
  "cooler",
  "ecosystem",
  "mechanism",
  "photosynthesis",
  "purpose",
  "rise",
  "rises",
  "sink",
  "sinks",
  "warmer",
]);

const UNSUPPORTED_CONTEXT_TERMS = new Set([
  "author",
  "damaged",
  "example",
  "examples",
  "intent",
  "multicellular",
  "opposite",
  "remember",
  "tissue",
  "vertex",
]);

const SYMBOL_TERM_HINTS = new Map<string, Set<string>>([
  ["a", new Set(["area", "acceleration"])],
  ["b", new Set(["base"])],
  ["f", new Set(["force"])],
  ["h", new Set(["height"])],
  ["i", new Set(["current"])],
  ["m", new Set(["mass"])],
  ["r", new Set(["radius", "resistance"])],
  ["v", new Set(["velocity", "voltage", "volume"])],
  ["x", new Set(["unknown", "value", "variable"])],
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

    const rawEvidence = input.citedEvidence.map((item) => item.excerpt).join(" ");
    const evidence = normalizeForMatching(rawEvidence);
    if (!evidence) return result(false, "INSUFFICIENT_EVIDENCE", []);

    const terms = extractClaimTerms(input.segment);
    const highSignalTerms = terms.filter(
      (term) => !LOW_RISK_CONNECTIVE_TERMS.has(term)
    );
    const unsupportedTerms = highSignalTerms.filter(
      (term) => !termAppears(term, evidence)
    );
    const relationFailure = validateConnectiveRelations(input.segment, rawEvidence);
    const boundedUnsupportedTerms = unique([
      ...unsupportedTerms,
      ...(relationFailure?.unsupportedTerms ?? []),
    ]);

    if (boundedUnsupportedTerms.length === 0) {
      return result(
        true,
        terms.some((term) => LOW_RISK_CONNECTIVE_TERMS.has(term))
          ? "SUPPORTED_WITH_CONNECTIVE_LANGUAGE"
          : "SUPPORTED",
        []
      );
    }

    return result(
      false,
      relationFailure?.reason ??
        classifyUnsupportedTerms(boundedUnsupportedTerms, highSignalTerms),
      boundedUnsupportedTerms,
      relationFailure?.unsupportedClaim
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
      unsupportedClaim: validation.unsupportedClaim,
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
  unsupportedTerms: string[],
  unsupportedClaim?: string
): GroundingValidatorResult {
  return {
    supported,
    reason,
    unsupportedTerms,
    unsupportedClaim,
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

function validateConnectiveRelations(segment: string, rawEvidence: string):
  | {
      reason: GroundingValidationReason;
      unsupportedTerms: string[];
      unsupportedClaim: string;
    }
  | null {
  const evidence = normalizeForMatching(rawEvidence);
  const mathEvidence = normalizeMathForMatching(rawEvidence);
  const normalizedSegment = normalizeForMatching(segment);

  if (
    (hasTerm(normalizedSegment, "formula") ||
      hasTerm(normalizedSegment, "formulas")) &&
    !evidenceContainsFormula(mathEvidence)
  ) {
    return {
      reason: "UNSUPPORTED_RELATION",
      unsupportedTerms: ["formula"],
      unsupportedClaim: "formula",
    };
  }

  for (const definition of extractSymbolDefinitions(segment)) {
    if (!symbolDefinitionSupported(definition, evidence, mathEvidence)) {
      return {
        reason: "MISSING_SYMBOL_DEFINITION",
        unsupportedTerms: unique([definition.symbol, definition.term]),
        unsupportedClaim: `${definition.symbol} represents ${definition.term}`,
      };
    }
  }

  return null;
}

function extractSymbolDefinitions(segment: string) {
  const normalized = segment
    .normalize("NFKC")
    .replace(/[’']/g, "'")
    .replace(/[;:,().]/g, " ");
  const definitions: Array<{ symbol: string; term: string }> = [];
  const pattern =
    /\b([A-Za-z])\s+(?:represents|represent|represented|representing|stands\s+for|means|is)\s+(?:the\s+)?([A-Za-z][A-Za-z-]*)/gi;

  for (const match of normalized.matchAll(pattern)) {
    const symbol = normalizeForMatching(match[1] ?? "");
    const term = normalizeForMatching(match[2] ?? "");
    if (!symbol || !term) continue;
    if (LOW_RISK_CONNECTIVE_TERMS.has(term)) continue;
    definitions.push({ symbol, term });
  }

  return definitions;
}

function symbolDefinitionSupported(
  definition: { symbol: string; term: string },
  evidence: string,
  mathEvidence: string
) {
  if (!hasTerm(evidence, definition.term)) return false;
  if (!formulaContainsSymbol(mathEvidence, definition.symbol)) return false;
  if (!evidenceContainsFormula(mathEvidence)) return false;

  const hints = SYMBOL_TERM_HINTS.get(definition.symbol);
  if (!hints?.has(definition.term)) return false;

  return true;
}

function evidenceContainsFormula(mathEvidence: string) {
  return (
    mathEvidence.includes("=") ||
    /\bpi\b.{0,20}\^[0-9]/i.test(mathEvidence) ||
    /\b(one half|half)\b.{0,30}\b(times|x|multiplied)\b/i.test(mathEvidence)
  );
}

function formulaContainsSymbol(mathEvidence: string, symbol: string) {
  return formulaFragments(mathEvidence).some((fragment) =>
    hasMathTerm(fragment, symbol)
  );
}

function formulaFragments(mathEvidence: string) {
  const fragments: string[] = [];
  for (const match of mathEvidence.matchAll(/=/g)) {
    const index = match.index ?? 0;
    fragments.push(mathEvidence.slice(Math.max(0, index - 40), index + 60));
  }
  for (const match of mathEvidence.matchAll(/\^[0-9]/g)) {
    const index = match.index ?? 0;
    fragments.push(mathEvidence.slice(Math.max(0, index - 30), index + 30));
  }
  return fragments.length > 0 ? fragments : [mathEvidence];
}

function classifyUnsupportedTerms(
  unsupportedTerms: string[],
  highSignalTerms: string[]
): GroundingValidationReason {
  if (unsupportedTerms.some((term) => UNSUPPORTED_MECHANISM_TERMS.has(term))) {
    return "UNSUPPORTED_MECHANISM";
  }
  if (unsupportedTerms.some((term) => UNSUPPORTED_CONTEXT_TERMS.has(term))) {
    return "UNSUPPORTED_CONTEXT";
  }
  if (unsupportedTerms.length >= Math.max(1, highSignalTerms.length)) {
    return "UNSUPPORTED_ENTITY";
  }

  return "PARTIALLY_SUPPORTED";
}

function hasTerm(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

function hasPhrase(text: string, phrase: string) {
  return text.includes(normalizeForMatching(phrase));
}

function hasMathTerm(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

function normalizeForMatching(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/π/g, " pi ")
    .replace(/×/g, " x ")
    .replace(/²/g, " 2 ")
    .replace(/[^\p{L}\p{N}/]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMathForMatching(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/π/g, " pi ")
    .replace(/×/g, " x ")
    .replace(/²/g, "^2")
    .replace(/[^\p{L}\p{N}/=^+\-*/]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, 40);
}
