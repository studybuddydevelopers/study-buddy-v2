import { GROUNDING_VALIDATOR_VERSION } from "./config";
import type { GroundedTeachAnswerSegment } from "./structured-output";

export type GroundingValidationReason =
  | "SUPPORTED"
  | "SUPPORTED_RELATION"
  | "SUPPORTED_WITH_CONNECTIVE_LANGUAGE"
  | "LOW_RISK_RELATIONAL_GLUE"
  | "MISSING_SYMBOL_DEFINITION"
  | "UNSUPPORTED_ENTITY"
  | "UNSUPPORTED_RELATION"
  | "UNSUPPORTED_MECHANISM"
  | "UNSUPPORTED_CONTEXT"
  | "UNSUPPORTED_EVALUATION"
  | "UNSUPPORTED_IMPORTANCE_CLAIM"
  | "UNSUPPORTED_CAUSAL_EXTENSION"
  | "RESOURCE_INJECTION"
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
  "value",
  "values",
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

const LOW_RISK_RELATIONAL_TERMS = new Set([
  "allow",
  "allows",
  "enable",
  "enables",
  "help",
  "helps",
  "involved",
  "serve",
  "serves",
  "support",
  "supports",
  "useful",
  "used",
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

const UNSUPPORTED_IMPORTANCE_TERMS = new Set([
  "beneficial",
  "essential",
  "important",
  "necessary",
  "survival",
  "vital",
]);

const UNSUPPORTED_CAUSAL_EXTENSION_TERMS = new Set([
  "disease",
  "ensures",
  "health",
  "healthy",
  "illness",
  "prevents",
]);

const CALCULATION_CONNECTIVE_TERMS = [
  "given",
  "hence",
  "so",
  "substituting",
  "therefore",
  "using",
  "values",
  "we",
  "have",
  "gives",
];

const SYMBOL_TERM_HINTS = new Map<string, Set<string>>([
  ["a", new Set(["area", "acceleration"])],
  ["b", new Set(["base"])],
  ["d", new Set(["diameter", "distance"])],
  ["f", new Set(["force"])],
  ["h", new Set(["height"])],
  ["i", new Set(["current"])],
  ["m", new Set(["mass"])],
  ["r", new Set(["radius", "resistance"])],
  ["v", new Set(["velocity", "voltage", "volume"])],
  ["x", new Set(["unknown", "value", "variable"])],
  ["y", new Set(["percentage", "percentage yield", "yield"])],
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

    const resourceInstructionFailure = validateResourceInstructionIsolation(
      input.segment,
      rawEvidence
    );
    if (resourceInstructionFailure) {
      return result(
        false,
        "RESOURCE_INJECTION",
        resourceInstructionFailure.unsupportedTerms,
        resourceInstructionFailure.unsupportedClaim
      );
    }

    const terms = extractClaimTerms(input.segment);
    const domainRelation = validateDomainSpecificRelation(
      input.segment,
      rawEvidence
    );
    const pedagogicalRelation = domainRelation?.supported
      ? null
      : validatePedagogicalRelation(input.segment, rawEvidence);
    const domainFailure =
      domainRelation && !domainRelation.supported ? domainRelation : null;
    const pedagogicalFailure =
      pedagogicalRelation && !pedagogicalRelation.supported
        ? pedagogicalRelation
        : null;
    const supportedRelationalTerms = [
      ...(domainRelation?.supported ? domainRelation.glueTerms : []),
      ...(pedagogicalRelation?.supported ? pedagogicalRelation.glueTerms : []),
    ];
    const highSignalTerms = terms.filter(
      (term) =>
        !LOW_RISK_CONNECTIVE_TERMS.has(term) &&
        !supportedRelationalTerms.includes(term)
    );
    const unsupportedTerms = highSignalTerms.filter(
      (term) => !termAppears(term, evidence)
    );
    const relationFailure = validateConnectiveRelations(input.segment, rawEvidence);
    const boundedUnsupportedTerms = unique([
      ...unsupportedTerms,
      ...(relationFailure?.unsupportedTerms ?? []),
      ...(domainFailure?.unsupportedTerms ?? []),
      ...(pedagogicalFailure?.unsupportedTerms ?? []),
    ]);

    if (boundedUnsupportedTerms.length === 0) {
      return result(
        true,
        domainRelation?.supported
          ? "SUPPORTED_RELATION"
          : pedagogicalRelation?.supported
          ? "LOW_RISK_RELATIONAL_GLUE"
          : terms.some((term) => LOW_RISK_CONNECTIVE_TERMS.has(term))
          ? "SUPPORTED_WITH_CONNECTIVE_LANGUAGE"
          : "SUPPORTED",
        []
      );
    }

    return result(
      false,
      domainFailure?.reason ??
        pedagogicalFailure?.reason ??
        relationFailure?.reason ??
        classifyUnsupportedTerms(boundedUnsupportedTerms, highSignalTerms),
      boundedUnsupportedTerms,
      domainFailure?.unsupportedClaim ??
        pedagogicalFailure?.unsupportedClaim ??
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

type PedagogicalRelationAnalysis =
  | {
      supported: true;
      glueTerms: string[];
    }
  | {
      supported: false;
      reason: GroundingValidationReason;
      unsupportedTerms: string[];
      unsupportedClaim: string;
    }
  | null;

function validatePedagogicalRelation(
  segment: string,
  rawEvidence: string
): PedagogicalRelationAnalysis {
  const normalizedSegment = normalizeForMatching(segment);
  const evidence = normalizeForMatching(rawEvidence);
  const strongClaim = findUnsupportedEvaluativeClaim(normalizedSegment);
  if (strongClaim) return strongClaim;

  const relation = extractLowRiskPedagogicalRelation(segment);
  if (!relation) return null;

  const objectTerms = relation.objectTerms.filter(
    (term) =>
      !LOW_RISK_CONNECTIVE_TERMS.has(term) &&
      !LOW_RISK_RELATIONAL_TERMS.has(term)
  );
  const missingTerms = unique(
    [relation.subject, ...objectTerms].filter(
      (term) => !termAppears(term, evidence)
    )
  );
  const subjectMatches = termAppears(relation.subject, evidence);
  const relationMatches =
    subjectMatches &&
    objectTerms.length > 0 &&
    evidenceSentenceSupportsRelation(rawEvidence, relation.subject, objectTerms);

  if (relationMatches && missingTerms.length === 0) {
    return {
      supported: true,
      glueTerms: relation.glueTerms,
    };
  }

  return {
    supported: false,
    reason: subjectMatches ? "UNSUPPORTED_RELATION" : "UNSUPPORTED_ENTITY",
    unsupportedTerms: missingTerms.length > 0 ? missingTerms : relation.glueTerms,
    unsupportedClaim: `${relation.subject} ${relation.phrase} ${relation.objectText}`,
  };
}

function findUnsupportedEvaluativeClaim(
  normalizedSegment: string
): PedagogicalRelationAnalysis {
  const importanceTerms = Array.from(UNSUPPORTED_IMPORTANCE_TERMS).filter((term) =>
    hasTerm(normalizedSegment, term)
  );
  if (importanceTerms.length > 0) {
    return {
      supported: false,
      reason: "UNSUPPORTED_IMPORTANCE_CLAIM",
      unsupportedTerms: importanceTerms,
      unsupportedClaim: importanceTerms.join(" "),
    };
  }

  const causalExtensionTerms = Array.from(
    UNSUPPORTED_CAUSAL_EXTENSION_TERMS
  ).filter((term) => hasTerm(normalizedSegment, term));
  if (causalExtensionTerms.length > 0) {
    return {
      supported: false,
      reason: "UNSUPPORTED_CAUSAL_EXTENSION",
      unsupportedTerms: causalExtensionTerms,
      unsupportedClaim: causalExtensionTerms.join(" "),
    };
  }

  return null;
}

function extractLowRiskPedagogicalRelation(segment: string) {
  const normalized = normalizeForMatching(segment);
  const patterns: Array<{
    phrase: string;
    glueTerms: string[];
    pattern: RegExp;
  }> = [
    {
      phrase: "useful because",
      glueTerms: ["useful"],
      pattern: /\b([a-z][a-z0-9]*)\s+(?:is\s+)?useful\s+because\s+(.+)$/i,
    },
    {
      phrase: "useful for",
      glueTerms: ["useful"],
      pattern: /\b([a-z][a-z0-9]*)\s+(?:is\s+)?useful\s+for\s+(.+)$/i,
    },
    {
      phrase: "used for",
      glueTerms: ["used"],
      pattern: /\b([a-z][a-z0-9]*)\s+(?:is\s+)?used\s+for\s+(.+)$/i,
    },
    {
      phrase: "used to",
      glueTerms: ["used"],
      pattern: /\b([a-z][a-z0-9]*)\s+(?:is\s+)?used\s+to\s+(.+)$/i,
    },
    {
      phrase: "helps with",
      glueTerms: ["helps"],
      pattern: /\b([a-z][a-z0-9]*)\s+(?:helps|help)\s+with\s+(.+)$/i,
    },
    {
      phrase: "helps to",
      glueTerms: ["helps"],
      pattern: /\b([a-z][a-z0-9]*)\s+(?:helps|help)\s+to\s+(.+)$/i,
    },
    {
      phrase: "allows",
      glueTerms: ["allows"],
      pattern: /\b([a-z][a-z0-9]*)\s+(?:allows|allow|enables|enable)\s+(.+)$/i,
    },
    {
      phrase: "involved in",
      glueTerms: ["involved"],
      pattern: /\b([a-z][a-z0-9]*)\s+(?:is\s+)?involved\s+in\s+(.+)$/i,
    },
    {
      phrase: "serves to",
      glueTerms: ["serves"],
      pattern: /\b([a-z][a-z0-9]*)\s+(?:serves|serve)\s+to\s+(.+)$/i,
    },
    {
      phrase: "serves for",
      glueTerms: ["serves"],
      pattern: /\b([a-z][a-z0-9]*)\s+(?:serves|serve)\s+for\s+(.+)$/i,
    },
  ];

  for (const item of patterns) {
    const match = normalized.match(item.pattern);
    const subject = normalizeForMatching(match?.[1] ?? "");
    const objectText = normalizeForMatching(match?.[2] ?? "");
    if (!subject || !objectText) continue;
    return {
      subject,
      phrase: item.phrase,
      glueTerms: item.glueTerms,
      objectText,
      objectTerms: extractClaimTerms(objectText),
    };
  }

  return null;
}

function evidenceSentenceSupportsRelation(
  rawEvidence: string,
  subject: string,
  objectTerms: string[]
) {
  const sentences = rawEvidence
    .split(/[.!?]+/)
    .map(normalizeForMatching)
    .filter(Boolean);

  return sentences.some(
    (sentence) =>
      termAppears(subject, sentence) &&
      objectTerms.every((term) => termAppears(term, sentence))
  );
}

function validateResourceInstructionIsolation(segment: string, rawEvidence: string) {
  if (!hasInstructionLikeEvidence(rawEvidence)) return null;

  const normalizedSegment = normalizeForMatching(segment);
  const suspiciousTerms = [
    "developer",
    "hidden",
    "instruction",
    "instructions",
    "override",
    "prompt",
    "reveal",
    "source_777",
    "system",
  ].filter((term) => hasTerm(normalizedSegment, term));

  if (suspiciousTerms.length === 0) return null;

  return {
    unsupportedTerms: suspiciousTerms,
    unsupportedClaim: suspiciousTerms.join(" "),
  };
}

function hasInstructionLikeEvidence(rawEvidence: string) {
  return /\b(?:ignore\s+(?:previous|all|system|developer)?\s*instructions?|reveal\s+(?:the\s+)?(?:system\s+prompt|prompt|hidden|developer)|hidden\s+(?:developer|system)\s+instructions?|cite\s+source_[0-9]+|override\s+(?:all\s+)?(?:safety|rules|system|instructions?)|developer\s+message|system\s+prompt|answer\s+with)\b/i.test(
    rawEvidence
  );
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
    .replace(/[,.]/g, " $& ")
    .replace(/[;:()]/g, " ");
  const definitions: Array<{ symbol: string; term: string }> = [];
  const pattern =
    /\b([A-Za-z])\s+(?:represents|represent|represented|representing|stands\s+for|means|is)\s+(?:the\s+)?([A-Za-z][A-Za-z-]*(?:\s+(?!and\b|or\b|but\b|where\b|when\b|with\b|of\b|in\b|for\b|from\b|to\b|[A-Za-z]\b)[A-Za-z][A-Za-z-]*)?)/gi;

  for (const match of normalized.matchAll(pattern)) {
    const symbol = normalizeForMatching(match[1] ?? "");
    const term = normalizeForMatching(match[2] ?? "");
    if (!symbol || !term) continue;
    if (LOW_RISK_CONNECTIVE_TERMS.has(term)) continue;
    if (/\b(?:cheaper|lower|less|better|best|cost|price|unit|per)\b/.test(term)) {
      continue;
    }
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
  if (evidenceExplicitlyDefinesSymbol(definition, evidence)) return true;

  const hints = SYMBOL_TERM_HINTS.get(definition.symbol);
  if (!hints || !Array.from(hints).some((hint) => termCompatible(definition.term, hint))) {
    return false;
  }

  return true;
}

function evidenceExplicitlyDefinesSymbol(
  definition: { symbol: string; term: string },
  evidence: string
) {
  const termPattern = definition.term
    .split(/\s+/)
    .filter((term) => term.length > 1 && !CLAIM_TERM_STOPWORDS.has(term))
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(String.raw`\s+`);
  if (!termPattern) return false;

  const symbol = definition.symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const directDefinition = new RegExp(
    String.raw`\b${symbol}\b\s+(?:means|represents?|stands\s+for|denotes|is)\s+(?:the\s+)?${termPattern}\b`,
    "i"
  );
  const reverseDefinition = new RegExp(
    String.raw`\b${termPattern}\b\s+(?:is|means)?\s*(?:represented\s+by|denoted\s+by|shown\s+by|symboli[sz]ed\s+by)\s+\b${symbol}\b`,
    "i"
  );
  const sentences = evidence
    .split(/[.!?;]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.some(
    (sentence) =>
      directDefinition.test(sentence) || reverseDefinition.test(sentence)
  );
}

function termCompatible(term: string, hint: string) {
  return term === hint || term.includes(hint) || hint.includes(term);
}

function validateDomainSpecificRelation(
  segment: string,
  rawEvidence: string
): PedagogicalRelationAnalysis {
  return (
    validateCircleFormulaExplanationRelation(segment, rawEvidence) ??
    validateGenericUnitComparisonRelation(segment, rawEvidence) ??
    validateTwoSourceArithmeticRelation(segment, rawEvidence) ??
    validateEquationStepRelation(segment, rawEvidence) ??
    validateSeparationMethodRelation(segment, rawEvidence)
  );
}

function validateGenericUnitComparisonRelation(
  segment: string,
  rawEvidence: string
): PedagogicalRelationAnalysis {
  const normalizedSegment = normalizeForMatching(segment);
  const evidence = normalizeForMatching(rawEvidence);
  const calculations = extractUnitMetricCalculations(segment);
  if (calculations.length === 0 && !mentionsUnitMetricComparison(normalizedSegment)) {
    return null;
  }

  const hasRule =
    hasPhrase(evidence, "unit price") ||
    hasPhrase(evidence, "unit cost") ||
    hasPhrase(evidence, "cost per") ||
    hasPhrase(evidence, "price per") ||
    (hasTerm(evidence, "divide") && hasTerm(evidence, "cost")) ||
    (hasTerm(evidence, "divided") && hasTerm(evidence, "number"));
  const supportedCalculations = calculations.filter((calculation) =>
    unitMetricCalculationSupported(calculation, evidence)
  );
  const hasComparison =
    /\b(?:lower|cheaper|less|better|best|lowest|least)\b/.test(
      normalizedSegment
    );

  if (
    hasRule &&
    calculations.length === 0 &&
    hasComparison &&
    comparisonConclusionSupportedFromEvidence(normalizedSegment, evidence)
  ) {
    return {
      supported: true,
      glueTerms: unique([
        "unit",
        "cost",
        "price",
        "per",
        "cheaper",
        "lower",
        "better",
        "than",
      ]),
    };
  }

  if (
    hasRule &&
    calculations.length >= 1 &&
    supportedCalculations.length === calculations.length &&
    !hasComparison
  ) {
    return {
      supported: true,
      glueTerms: unique([
        "unit",
        "price",
        "cost",
        "per",
        "giving",
        "gives",
        "a",
        ...calculations.flatMap((item) => [
          item.option.toLowerCase(),
          item.cost,
          item.count,
          item.metric,
        ]),
      ]),
    };
  }

  if (
    hasRule &&
    calculations.length >= 2 &&
    supportedCalculations.length === calculations.length &&
    (!hasComparison || comparisonConclusionSupported(calculations, normalizedSegment))
  ) {
    return {
      supported: true,
      glueTerms: unique([
        "unit",
        "price",
        "cost",
        "per",
        "giving",
        "gives",
        "a",
        "lower",
        "cheaper",
        "better",
        "compared",
        ...calculations.flatMap((item) => [
          item.option.toLowerCase(),
          item.cost,
          item.count,
          item.metric,
        ]),
      ]),
    };
  }

  return {
    supported: false,
    reason: "UNSUPPORTED_RELATION",
    unsupportedTerms: unique([
      ...(hasRule ? [] : ["unit", "price"]),
      ...calculations
        .filter((item) => !supportedCalculations.includes(item))
        .flatMap((item) => [item.option.toLowerCase(), item.metric]),
      ...(hasComparison && !comparisonConclusionSupported(calculations, normalizedSegment)
        ? ["comparison"]
        : []),
    ]),
    unsupportedClaim: "unit metric comparison",
  };
}

function mentionsUnitMetricComparison(segment: string) {
  return /\b(?:unit price|unit cost|per item|per pen|per page|per gb|per litre|per liter|better value|cheaper per|lower unit)\b/.test(
    segment
  );
}

function extractUnitMetricCalculations(segment: string) {
  const normalized = normalizeForMatching(segment);
  const results: Array<{
    option: string;
    cost: string;
    count: string;
    metric: string;
  }> = [];
  const patterns = [
    /\b(?:option|pack|plan|crate|bundle|tin|box)\s+([a-z0-9]+)[^.?!;]*?\b(?:costs?|is)\s+([0-9]+)[^.?!;]*?\b(?:for|contains?|has)\s+([0-9]+)[^.?!;]*?\b(?:unit\s+(?:price|cost)|cost\s+per|price\s+per|giving|gives)\s+(?:(?:is|of)\s+)?([0-9]+)\b/gi,
    /\b(?:option|pack|plan|crate|bundle|tin|box)\s+([a-z0-9]+)[^.?!;]*?\b(?:costs?|is)\s+([0-9]+)[^.?!;]*?\b(?:for|contains?|has)\s+([0-9]+)[^.?!;]*?\b(?:giving|gives)\s+(?:a\s+)?(?:unit\s+(?:price|cost)|cost\s+per\s+[a-z]+|price\s+per\s+[a-z]+)\s+(?:(?:is|of)\s+)?([0-9]+)\b/gi,
    /\b(?:option|pack|plan|crate|bundle|tin|box)\s+([a-z0-9]+)[^.?!;]*?\b([0-9]+)\s*(?:naira|₦|pounds?|dollars?)\b[^.?!;]*?\b([0-9]+)\s+(?:items?|pens?|pages?|gb|litres?|liters?|bottles?)\b[^.?!;]*?\b([0-9]+)\s*(?:naira|₦|pounds?|dollars?)?\s+per\b/gi,
  ];

  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      const option = match[1] ?? "";
      const cost = match[2] ?? "";
      const count = match[3] ?? "";
      const metric = match[4] ?? "";
      if (!option || !cost || !count || !metric) continue;
      results.push({ option, cost, count, metric });
    }
  }

  return uniqueBy(results, (item) => `${item.option}:${item.cost}:${item.count}:${item.metric}`);
}

function unitMetricCalculationSupported(
  calculation: { option: string; cost: string; count: string; metric: string },
  evidence: string
) {
  const arithmeticCorrect =
    Number(calculation.count) > 0 &&
    Number(calculation.cost) / Number(calculation.count) ===
      Number(calculation.metric);
  if (!arithmeticCorrect) return false;
  const optionAppears = hasTerm(evidence, calculation.option);
  const costAppears = hasTerm(evidence, calculation.cost);
  const countAppears = hasTerm(evidence, calculation.count);
  return optionAppears && costAppears && countAppears;
}

function comparisonConclusionSupported(
  calculations: Array<{ option: string; metric: string }>,
  segment: string
) {
  if (calculations.length < 2) return false;
  const sorted = [...calculations].sort(
    (left, right) => Number(left.metric) - Number(right.metric)
  );
  const winner = sorted[0];
  if (!winner) return false;
  return hasTerm(segment, winner.option.toLowerCase());
}

function comparisonConclusionSupportedFromEvidence(segment: string, evidence: string) {
  const inputs = extractUnitMetricInputs(evidence);
  if (inputs.length < 2) return false;
  const ranked = inputs
    .map((input) => ({
      ...input,
      metric: Number(input.cost) / Number(input.count),
    }))
    .filter((input) => Number.isFinite(input.metric));
  if (ranked.length < 2) return false;

  const winner = [...ranked].sort((left, right) => left.metric - right.metric)[0];
  const loser = [...ranked].sort((left, right) => right.metric - left.metric)[0];
  if (!winner || !loser || winner.option === loser.option) return false;

  const statedWinner = extractStatedUnitComparisonWinner(segment);
  if (!statedWinner) return false;
  if (statedWinner.winner !== winner.option) return false;
  if (statedWinner.loser && statedWinner.loser !== loser.option) return false;
  return true;
}

function extractUnitMetricInputs(text: string) {
  const normalized = normalizeForMatching(text);
  const results: Array<{ option: string; cost: string; count: string }> = [];
  const pattern =
    /\b(?:option|pack|plan|crate|bundle|tin|box)\s+([a-z0-9]+)[^.?!;]*?\b(?:costs?|is)\s+([0-9]+)[^.?!;]*?\b(?:for|contains?|has)\s+([0-9]+)\b/gi;

  for (const match of normalized.matchAll(pattern)) {
    const option = match[1] ?? "";
    const cost = match[2] ?? "";
    const count = match[3] ?? "";
    if (!option || !cost || !count || Number(count) <= 0) continue;
    results.push({ option, cost, count });
  }

  return uniqueBy(results, (item) => `${item.option}:${item.cost}:${item.count}`);
}

function extractStatedUnitComparisonWinner(segment: string) {
  const patterns = [
    /\b(?:option|pack|plan|crate|bundle|tin|box)\s+([a-z0-9]+)\s+is\s+(?:the\s+)?(?:cheaper|lower|less|better|best|lowest|least)\b(?:[^.?!;]*?\bthan\s+(?:option|pack|plan|crate|bundle|tin|box)\s+([a-z0-9]+)\b)?/i,
    /\b(?:the\s+)?(?:cheaper|lower|better|best|lowest|least)\s+(?:option|pack|plan|crate|bundle|tin|box)\s+is\s+([a-z0-9]+)\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalizeForMatching(segment).match(pattern);
    const winner = match?.[1] ?? "";
    const loser = match?.[2] ?? "";
    if (winner) return { winner, loser: loser || null };
  }

  return null;
}

function validateCircleFormulaExplanationRelation(
  segment: string,
  rawEvidence: string
): PedagogicalRelationAnalysis {
  const normalizedSegment = normalizeForMatching(segment);
  const evidence = normalizeForMatching(rawEvidence);
  const mathEvidence = normalizeMathForMatching(rawEvidence);
  const describesPiApproximation =
    hasTerm(normalizedSegment, "pi") &&
    hasTerm(normalizedSegment, "constant") &&
    hasTerm(normalizedSegment, "approximately") &&
    hasTerm(normalizedSegment, "3") &&
    hasTerm(normalizedSegment, "14");

  if (!describesPiApproximation) return null;

  const supportsCircleAreaFormula =
    hasTerm(evidence, "area") &&
    hasTerm(evidence, "circle") &&
    hasTerm(evidence, "pi") &&
    hasTerm(evidence, "radius") &&
    (mathEvidence.includes("a = pi r^2") ||
      (hasPhrase(evidence, "pi times radius squared") &&
        mathEvidence.includes("r^2")));

  if (supportsCircleAreaFormula) {
    return {
      supported: true,
      glueTerms: ["constant", "approximately", "equal", "3", "14"],
    };
  }

  return {
    supported: false,
    reason: "UNSUPPORTED_RELATION",
    unsupportedTerms: ["constant", "approximately", "3", "14"],
    unsupportedClaim: "pi is approximately 3.14",
  };
}

function validateTwoSourceArithmeticRelation(
  segment: string,
  rawEvidence: string
): PedagogicalRelationAnalysis {
  const evidence = normalizeForMatching(rawEvidence);
  const powerCalculation = extractPowerCalculation(segment, rawEvidence);
  if (!powerCalculation) return null;

  const supportsPowerFormula =
    hasPhrase(evidence, "power = voltage x current") ||
    (hasTerm(evidence, "power") &&
      hasTerm(evidence, "voltage") &&
      hasTerm(evidence, "current") &&
      (hasTerm(evidence, "multiplying") || hasTerm(evidence, "multiply")));
  const supportsVoltage = hasUnitValue(evidence, powerCalculation.voltage, "v");
  const supportsCurrent = hasUnitValue(evidence, powerCalculation.current, "a");
  const arithmeticCorrect =
    Number(powerCalculation.voltage) * Number(powerCalculation.current) ===
    Number(powerCalculation.result);

  if (supportsPowerFormula && supportsVoltage && supportsCurrent && arithmeticCorrect) {
    return {
      supported: true,
      glueTerms: unique([
        ...CALCULATION_CONNECTIVE_TERMS.filter((term) =>
          hasTerm(normalizeForMatching(segment), term)
        ),
        "p",
        "i",
        "vi",
        "power",
        "calculated",
        "calculation",
        powerCalculation.voltage,
        "v",
        powerCalculation.current,
        "a",
        powerCalculation.result,
        "w",
      ]),
    };
  }

  return {
    supported: false,
    reason: "UNSUPPORTED_RELATION",
    unsupportedTerms: unique([
      ...(supportsPowerFormula ? [] : ["power", "formula"]),
      ...(supportsVoltage ? [] : [powerCalculation.voltage, "v"]),
      ...(supportsCurrent ? [] : [powerCalculation.current, "a"]),
      ...(arithmeticCorrect ? [] : [powerCalculation.result]),
    ]),
    unsupportedClaim: "power calculation",
  };
}

function extractPowerCalculation(segment: string, rawEvidence: string) {
  const explicitMultiplication = extractPowerMultiplication(segment);
  if (explicitMultiplication) return explicitMultiplication;

  const math = normalizeMathForMatching(segment);
  const viResult = math.match(
    /\bp\s*=\s*(?:v\s*(?:x|\*)?\s*i|vi)\s*=\s*(?:(\d+)\s*(?:v)?\s*(?:x|\*)\s*(\d+)\s*(?:a)?\s*=\s*)?([0-9]+)\s*w\b/i
  );
  if (viResult) {
    const values = powerUnitValues(segment, rawEvidence);
    const expressionValues =
      viResult[1] && viResult[2]
        ? [{ voltage: viResult[1], current: viResult[2] }]
        : [];
    const resultValue = viResult[3] ?? "";
    const matching = values.find(
      (item) => Number(item.voltage) * Number(item.current) === Number(resultValue)
    );
    const expressionMatching = expressionValues.find(
      (item) => Number(item.voltage) * Number(item.current) === Number(resultValue)
    );
    return {
      voltage:
        expressionMatching?.voltage ?? matching?.voltage ?? values[0]?.voltage ?? "",
      current:
        expressionMatching?.current ?? matching?.current ?? values[0]?.current ?? "",
      result: resultValue,
    };
  }

  const multiplication = extractStandalonePowerMultiplication(segment);
  if (multiplication) return multiplication;

  const resultOnly = math.match(/\b(?:power|p)\s*=\s*([0-9]+)\s*w?\b/i);
  if (!resultOnly) return null;
  const values = powerUnitValues("", rawEvidence);
  if (values.length === 0) return null;
  const resultValue = resultOnly[1] ?? "";
  const matching = values.find(
    (item) => Number(item.voltage) * Number(item.current) === Number(resultValue)
  );

  return {
    voltage: matching?.voltage ?? values[0]?.voltage ?? "",
    current: matching?.current ?? values[0]?.current ?? "",
    result: resultValue,
  };
}

function extractPowerMultiplication(segment: string) {
  const math = normalizeMathForMatching(segment);
  const match = math.match(
    /\b(?:power|p)\s*=\s*([0-9]+)\s*(?:v)?\s*(?:x|\*)\s*([0-9]+)\s*(?:a)?\s*=\s*([0-9]+)\s*w\b/i
  );
  if (!match) return null;
  return {
    voltage: match[1] ?? "",
    current: match[2] ?? "",
    result: match[3] ?? "",
  };
}

function extractStandalonePowerMultiplication(segment: string) {
  const math = normalizeMathForMatching(segment);
  const match = math.match(
    /\b([0-9]+)\s*(?:v)?\s*(?:x|\*)\s*([0-9]+)\s*(?:a)?\s*=\s*([0-9]+)\s*w\b/i
  );
  if (!match) return null;
  return {
    voltage: match[1] ?? "",
    current: match[2] ?? "",
    result: match[3] ?? "",
  };
}

function powerUnitValues(primaryText: string, fallbackText: string) {
  const primaryValues = pairUnitValues(primaryText);
  return primaryValues.length > 0 ? primaryValues : pairUnitValues(fallbackText);
}

function pairUnitValues(text: string) {
  const voltages = extractUnitValues(text, "v");
  const currents = extractUnitValues(text, "a");
  const values: Array<{ voltage: string; current: string }> = [];
  for (const voltage of voltages) {
    for (const current of currents) {
      values.push({ voltage, current });
    }
  }
  return values;
}

function extractUnitValues(text: string, unit: string) {
  const math = normalizeMathForMatching(text);
  const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Array.from(
    math.matchAll(new RegExp(`\\b([0-9]+)\\s*${escapedUnit}\\b`, "gi")),
    (match) => match[1] ?? ""
  ).filter(Boolean);
}

function hasUnitValue(evidence: string, value: string, unit: string) {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escapedValue}\\s*${escapedUnit}([^a-z0-9]|$)`, "i").test(
    evidence
  );
}

function validateEquationStepRelation(
  segment: string,
  rawEvidence: string
): PedagogicalRelationAnalysis {
  const normalizedSegment = normalizeForMatching(segment);
  const segmentMath = normalizeMathForMatching(segment);
  const evidenceMath = normalizeMathForMatching(rawEvidence);
  const operation = extractEquationOperation(segmentMath);
  const hasAlgebraConnective = ALGEBRA_STEP_GLUE_TERMS.some((term) =>
    hasTerm(normalizedSegment, term)
  );
  const segmentEquations = extractEquations(segmentMath);

  if (!operation && (!hasAlgebraConnective || segmentEquations.length === 0)) {
    return null;
  }

  const evidenceOperations = extractEquationOperations(evidenceMath);
  const evidenceEquations = extractEquations(evidenceMath);
  const priorEquation =
    segmentEquations.length > 1 ? segmentEquations[0] : undefined;
  const resultEquation = segmentEquations.at(-1);
  const operationSupported =
    !operation ||
    evidenceOperations.some(
      (item) =>
        item.kind === operation.kind && operandsMatch(item.operand, operation.operand)
    );
  const priorSupported =
    !priorEquation || evidenceEquations.includes(priorEquation);
  const resultSupported =
    !resultEquation || evidenceEquations.includes(resultEquation);

  if (operationSupported && priorSupported && resultSupported) {
    return {
      supported: true,
      glueTerms: relationGlueTerms(normalizedSegment, ALGEBRA_STEP_GLUE_TERMS),
    };
  }

  return {
    supported: false,
    reason: "UNSUPPORTED_RELATION",
    unsupportedTerms: unique([
      ...(operationSupported || !operation
        ? []
        : [operation.kind, operation.operand]),
      ...(priorSupported || !priorEquation ? [] : [priorEquation]),
      ...(resultSupported || !resultEquation ? [] : [resultEquation]),
    ]),
    unsupportedClaim: [
      operation ? `${operation.kind} ${operation.operand}` : null,
      resultEquation ? `to get ${resultEquation}` : null,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

const ALGEBRA_STEP_GLUE_TERMS = [
  "away",
  "equation",
  "get",
  "gets",
  "give",
  "gives",
  "isolate",
  "isolating",
  "keep",
  "keeps",
  "result",
  "resulting",
  "solve",
  "solved",
  "solving",
  "taking",
  "therefore",
];

type EquationOperationKind = "add" | "subtract" | "multiply" | "divide";

interface EquationOperation {
  kind: EquationOperationKind;
  operand: string;
}

function extractEquationOperation(value: string) {
  return extractEquationOperations(value)[0] ?? null;
}

function extractEquationOperations(value: string) {
  const patterns: Array<{
    kind: EquationOperationKind;
    pattern: RegExp;
  }> = [
    {
      kind: "subtract",
      pattern:
        /\bsubtract\s+([a-z0-9/]+)\s+from\s+(?:both|each)\s+sides?\b/g,
    },
    {
      kind: "subtract",
      pattern:
        /\b(?:take|taking)\s+([a-z0-9/]+)\s+away\s+from\s+(?:both|each)\s+sides?\b/g,
    },
    {
      kind: "divide",
      pattern: /\bdivide\s+(?:both|each)\s+sides?\s+by\s+([a-z0-9/]+)\b/g,
    },
    {
      kind: "multiply",
      pattern: /\bmultiply\s+(?:both|each)\s+sides?\s+by\s+([a-z0-9/]+)\b/g,
    },
    {
      kind: "add",
      pattern: /\badd\s+([a-z0-9/]+)\s+to\s+(?:both|each)\s+sides?\b/g,
    },
  ];
  const operations: EquationOperation[] = [];

  for (const item of patterns) {
    for (const match of value.matchAll(item.pattern)) {
      const operand = normalizeOperand(match[1] ?? "");
      if (!operand) continue;
      operations.push({ kind: item.kind, operand });
    }
  }

  return operations;
}

function normalizeOperand(value: string) {
  const normalized = normalizeForMatching(value);
  for (const [number, word] of NUMBER_WORDS.entries()) {
    if (normalized === word) return number;
  }
  return normalized;
}

function operandsMatch(left: string, right: string) {
  return normalizeOperand(left) === normalizeOperand(right);
}

function extractEquations(mathText: string) {
  const equations =
    mathText.match(
      /\b[a-z0-9]+(?:\s*(?:\+|-|\*|\/)\s*[a-z0-9]+)*\s*=\s*[a-z0-9]+(?:\s*(?:\+|-|\*|\/)\s*[a-z0-9]+)*/g
    ) ?? [];

  return unique(equations.map(canonicalEquation).filter(Boolean));
}

function canonicalEquation(value: string) {
  return value.replace(/\s+/g, "");
}

function validateSeparationMethodRelation(
  segment: string,
  rawEvidence: string
): PedagogicalRelationAnalysis {
  const normalizedSegment = normalizeForMatching(segment);
  const evidence = normalizeForMatching(rawEvidence);
  const mentionsFiltration = hasTerm(normalizedSegment, "filtration");
  const mentionsEvaporation = hasTerm(normalizedSegment, "evaporation");
  const mentionsSieving = hasTerm(normalizedSegment, "sieving");
  if (!mentionsFiltration && !mentionsEvaporation && !mentionsSieving) return null;

  const mechanismTerms = ["boiling", "chemical", "chemically", "density", "industrial", "safety"].filter(
    (term) => hasTerm(normalizedSegment, term) && !termAppears(term, evidence)
  );
  if (mechanismTerms.length > 0) {
    return {
      supported: false,
      reason: "UNSUPPORTED_MECHANISM",
      unsupportedTerms: mechanismTerms,
      unsupportedClaim: mechanismTerms.join(" "),
    };
  }

  if (mentionsSieving) {
    const sieving = validateSievingRelation(normalizedSegment, evidence);
    if (sieving) return sieving;
  }

  if (mentionsFiltration) {
    const filtration = validateFiltrationRelation(normalizedSegment, evidence);
    if (filtration) return filtration;
  }

  if (mentionsEvaporation) {
    const evaporation = validateEvaporationRelation(normalizedSegment, evidence);
    if (evaporation) return evaporation;
  }

  return null;
}

function validateSievingRelation(
  segment: string,
  evidence: string
): PedagogicalRelationAnalysis {
  const hasProcessVerb = PROCESS_RELATION_GLUE_TERMS.some((term) =>
    hasTerm(segment, term)
  );
  const mentionsSolidParticles =
    hasTerm(segment, "solid") && hasTerm(segment, "particles");
  const mentionsSize = hasTerm(segment, "size") || hasTerm(segment, "sizes");
  const mentionsMesh = hasTerm(segment, "mesh");
  const hasNegation = hasNegationTerm(segment);
  const mentionsDissolved =
    hasTerm(segment, "dissolved") ||
    (hasTerm(segment, "dissolve") || hasTerm(segment, "dissolves"));
  const mentionsSolution = hasTerm(segment, "solution");

  if (hasUnsupportedSievingMechanism(segment)) {
    return {
      supported: false,
      reason: "UNSUPPORTED_MECHANISM",
      unsupportedTerms: unsupportedSievingMechanismTerms(segment),
      unsupportedClaim: "unsupported sieving mechanism",
    };
  }

  if (hasNegation && mentionsDissolved && mentionsSolution) {
    return evidenceSupportsSievingDissolvedCaveat(evidence)
      ? {
          supported: true,
          glueTerms: relationGlueTerms(segment, PROCESS_RELATION_GLUE_TERMS),
        }
      : {
          supported: false,
          reason: "UNSUPPORTED_RELATION",
          unsupportedTerms: ["dissolved", "solution"],
          unsupportedClaim: "sieving dissolved-substance caveat",
        };
  }

  if (mentionsDissolved) {
    return {
      supported: false,
      reason: "UNSUPPORTED_RELATION",
      unsupportedTerms: ["dissolved"],
      unsupportedClaim: "sieving separates dissolved substances",
    };
  }

  if (!hasProcessVerb) return null;

  if (
    mentionsSolidParticles &&
    mentionsSize &&
    mentionsMesh &&
    evidenceSupportsSievingSizeMeshRelation(evidence)
  ) {
    return {
      supported: true,
      glueTerms: relationGlueTerms(segment, PROCESS_RELATION_GLUE_TERMS),
    };
  }

  if (mentionsSolidParticles || mentionsSize || mentionsMesh) {
    return {
      supported: false,
      reason: "UNSUPPORTED_RELATION",
      unsupportedTerms: unique([
        ...(mentionsSolidParticles ? [] : ["solid", "particles"]),
        ...(mentionsSize ? [] : ["size"]),
        ...(mentionsMesh ? [] : ["mesh"]),
      ]),
      unsupportedClaim: "sieving solid-particle size relation",
    };
  }

  return null;
}

function validateFiltrationRelation(
  segment: string,
  evidence: string
): PedagogicalRelationAnalysis {
  const hasProcessVerb = PROCESS_RELATION_GLUE_TERMS.some((term) =>
    hasTerm(segment, term)
  );
  const mentionsDissolvedSolid =
    hasTerm(segment, "dissolved") && hasTerm(segment, "solid");
  const mentionsInsolubleSolid =
    hasTerm(segment, "insoluble") && hasTerm(segment, "solid");
  const mentionsLiquid = hasTerm(segment, "liquid");
  const hasNegation = hasNegationTerm(segment);

  if (hasNegation && mentionsDissolvedSolid && mentionsLiquid) {
    return evidenceSupportsFiltrationDissolvedCaveat(evidence)
      ? {
          supported: true,
          glueTerms: relationGlueTerms(segment, PROCESS_RELATION_GLUE_TERMS),
        }
      : {
          supported: false,
          reason: "UNSUPPORTED_RELATION",
          unsupportedTerms: ["dissolved", "solid"],
          unsupportedClaim: "filtration cannot separate dissolved solid",
        };
  }

  if (!hasProcessVerb && !mentionsDissolvedSolid) return null;

  if (mentionsDissolvedSolid) {
    return {
      supported: false,
      reason: "UNSUPPORTED_RELATION",
      unsupportedTerms: ["dissolved", "solid"],
      unsupportedClaim: "filtration separates dissolved solid",
    };
  }

  if (
    mentionsInsolubleSolid &&
    mentionsLiquid &&
    evidenceSupportsFiltrationInsolubleRelation(evidence)
  ) {
    return {
      supported: true,
      glueTerms: relationGlueTerms(segment, PROCESS_RELATION_GLUE_TERMS),
    };
  }

  if (mentionsInsolubleSolid || mentionsLiquid) {
    return {
      supported: false,
      reason: "UNSUPPORTED_RELATION",
      unsupportedTerms: unique([
        ...(mentionsInsolubleSolid ? [] : ["insoluble", "solid"]),
        ...(mentionsLiquid ? [] : ["liquid"]),
      ]),
      unsupportedClaim: "filtration separation relation",
    };
  }

  return null;
}

function validateEvaporationRelation(
  segment: string,
  evidence: string
): PedagogicalRelationAnalysis {
  const hasProcessVerb = PROCESS_RELATION_GLUE_TERMS.some((term) =>
    hasTerm(segment, term)
  );
  const mentionsDissolvedSolid =
    hasTerm(segment, "dissolved") && hasTerm(segment, "solid");
  const mentionsSolution =
    hasTerm(segment, "solution") ||
    (hasTerm(segment, "solvent") && hasTerm(segment, "removed"));
  const mentionsInsolubleSolid =
    hasTerm(segment, "insoluble") && hasTerm(segment, "solid");

  if (!hasProcessVerb && !mentionsInsolubleSolid) return null;

  if (mentionsInsolubleSolid) {
    return {
      supported: false,
      reason: "UNSUPPORTED_RELATION",
      unsupportedTerms: ["insoluble", "solid"],
      unsupportedClaim: "evaporation separates insoluble solid",
    };
  }

  if (
    mentionsDissolvedSolid &&
    mentionsSolution &&
    evidenceSupportsEvaporationDissolvedRelation(evidence)
  ) {
    return {
      supported: true,
      glueTerms: relationGlueTerms(segment, PROCESS_RELATION_GLUE_TERMS),
    };
  }

  if (mentionsDissolvedSolid || mentionsSolution) {
    return {
      supported: false,
      reason: "UNSUPPORTED_RELATION",
      unsupportedTerms: unique([
        ...(mentionsDissolvedSolid ? [] : ["dissolved", "solid"]),
        ...(mentionsSolution ? [] : ["solution"]),
      ]),
      unsupportedClaim: "evaporation dissolved-solid relation",
    };
  }

  return null;
}

const PROCESS_RELATION_GLUE_TERMS = [
  "be",
  "can",
  "leaves",
  "recover",
  "recovers",
  "remove",
  "removes",
  "separate",
  "separates",
  "should",
  "suitable",
  "use",
  "used",
];

function evidenceSupportsFiltrationInsolubleRelation(evidence: string) {
  return (
    hasTerm(evidence, "filtration") &&
    hasTerm(evidence, "insoluble") &&
    hasTerm(evidence, "solid") &&
    hasTerm(evidence, "liquid") &&
    (termAppears("separate", evidence) || termAppears("remove", evidence))
  );
}

function evidenceSupportsFiltrationDissolvedCaveat(evidence: string) {
  return (
    hasTerm(evidence, "filtration") &&
    hasNegationTerm(evidence) &&
    hasTerm(evidence, "dissolved") &&
    hasTerm(evidence, "solid") &&
    hasTerm(evidence, "liquid")
  );
}

function evidenceSupportsEvaporationDissolvedRelation(evidence: string) {
  return (
    hasTerm(evidence, "evaporation") &&
    hasTerm(evidence, "dissolved") &&
    hasTerm(evidence, "solid") &&
    (hasTerm(evidence, "solution") ||
      (hasTerm(evidence, "solvent") && hasTerm(evidence, "removed"))) &&
    (termAppears("recover", evidence) || termAppears("remove", evidence))
  );
}

function evidenceSupportsSievingSizeMeshRelation(evidence: string) {
  return (
    hasTerm(evidence, "sieving") &&
    hasTerm(evidence, "solid") &&
    hasTerm(evidence, "particles") &&
    hasTerm(evidence, "size") &&
    hasTerm(evidence, "mesh") &&
    termAppears("separate", evidence)
  );
}

function evidenceSupportsSievingDissolvedCaveat(evidence: string) {
  return (
    hasTerm(evidence, "sieving") &&
    hasNegationTerm(evidence) &&
    hasTerm(evidence, "dissolved") &&
    hasTerm(evidence, "solution") &&
    termAppears("separate", evidence)
  );
}

function hasUnsupportedSievingMechanism(segment: string) {
  return unsupportedSievingMechanismTerms(segment).length > 0;
}

function unsupportedSievingMechanismTerms(segment: string) {
  return unique([
    ...(hasTerm(segment, "density") ? ["density"] : []),
    ...(hasTerm(segment, "chemical") || hasTerm(segment, "chemically")
      ? ["chemical"]
      : []),
    ...(hasTerm(segment, "react") || hasTerm(segment, "reacts")
      ? ["reacts"]
      : []),
    ...(hasTerm(segment, "evaporate") || hasTerm(segment, "evaporates")
      ? ["evaporates"]
      : []),
    ...(hasTerm(segment, "dissolve") || hasTerm(segment, "dissolves")
      ? ["dissolves"]
      : []),
  ]);
}

function hasNegationTerm(value: string) {
  return (
    hasTerm(value, "cannot") ||
    hasPhrase(value, "can not") ||
    hasTerm(value, "not")
  );
}

function relationGlueTerms(text: string, terms: string[]) {
  return terms.filter((term) => hasTerm(text, term));
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

function uniqueBy<T>(values: T[], key: (value: T) => string) {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const itemKey = key(value);
    if (seen.has(itemKey)) continue;
    seen.add(itemKey);
    result.push(value);
  }
  return result;
}
