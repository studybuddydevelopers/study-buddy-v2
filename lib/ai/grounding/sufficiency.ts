import type { RetrievedChunk } from "@/lib/resources/retrieval/types";
import { SUFFICIENCY_POLICY_VERSION } from "./config";

export type GroundingConfidence = "HIGH" | "MEDIUM" | "LOW";
export type SufficiencyReason =
  | "SUPPORTED"
  | "NO_RESULTS"
  | "LOW_RELEVANCE"
  | "FILTERED_CORPUS_GAP"
  | "POSSIBLE_CONFLICT"
  | "MISSING_REQUIRED_SOURCE_TYPE"
  | "RESOURCE_CONFLICT"
  | "USER_INSTRUCTION_CONFLICT"
  | "REQUIRED_INPUT_MISSING"
  | "REQUIRED_SYMBOL_DEFINITION_MISSING"
  | "REQUIRED_COMPARISON_SIDE_MISSING"
  | "REQUIRED_CONCEPT_MISSING"
  | "CONCEPT_MISMATCH";

export interface RetrievalSufficiency {
  sufficient: boolean;
  confidence: GroundingConfidence;
  reason: SufficiencyReason;
  selectedChunks: RetrievedChunk[];
  policyVersion: string;
  evidenceShape?: "DIRECT_SHORT_DEFINITION_SUPPORT";
}

export interface EvaluateRetrievalSufficiencyInput {
  query: string;
  candidates: RetrievedChunk[];
  subjectId?: string | null;
  topicId?: string | null;
  selectedChunks: RetrievedChunk[];
}

export type GroundingRequestIntent =
  | "CALCULATION"
  | "COMPARISON"
  | "MULTI_OPTION_COMPARISON"
  | "FORMULA_WITH_SYMBOL_DEFINITIONS"
  | "SYMBOL_DEFINITION"
  | "FORMULA_REQUEST"
  | "CONCEPT_DEFINITION"
  | "GENERAL";

export type RequestRequirement =
  | { kind: "SINGLE_CONCEPT"; concept: string }
  | { kind: "COMPARISON"; sides: string[] }
  | { kind: "FORMULA"; quantity: string | null }
  | { kind: "FORMULA_WITH_SYMBOLS"; quantity: string | null; symbols: string[] }
  | { kind: "CALCULATION"; quantity: string | null; requiredInputs: string[] }
  | { kind: "MULTI_OPTION_COMPARISON"; options: string[] }
  | { kind: "RELATION"; relation: string };

const MAX_LOW_VECTOR_DISTANCE = 0.88;
const MIN_KEYWORD_SCORE = 0.01;
const MIN_HIGH_SIGNAL_TERM_COVERAGE = 0.5;
const MIN_TERMS_FOR_COVERAGE_GATE = 2;
const HIGH_SIGNAL_STOPWORDS = new Set([
  "about",
  "also",
  "answer",
  "could",
  "adding",
  "card",
  "does",
  "explain",
  "examples",
  "find",
  "from",
  "give",
  "gives",
  "have",
  "help",
  "ignore",
  "label",
  "many",
  "mean",
  "memory",
  "need",
  "needed",
  "official",
  "please",
  "question",
  "relevant",
  "resource",
  "rules",
  "server",
  "show",
  "simple",
  "source",
  "sources",
  "state",
  "supplied",
  "that",
  "terms",
  "this",
  "today",
  "topic",
  "teach",
  "unrelated",
  "using",
  "used",
  "what",
  "when",
  "where",
  "which",
  "without",
  "with",
  "year",
]);

interface ConceptDefinition {
  id: string;
  group: string;
  aliases: string[];
}

const CONCEPT_DEFINITIONS: ConceptDefinition[] = [
  concept("triangle", "shape", ["triangle", "triangular"]),
  concept("circle", "shape", ["circle", "circular"]),
  concept("rectangle", "shape", ["rectangle", "rectangular"]),
  concept("area", "measurement", ["area"]),
  concept("perimeter", "measurement", ["perimeter"]),
  concept("circumference", "circle_boundary_measurement", ["circumference"]),
  concept("speed", "motion_quantity", ["speed"]),
  concept("acceleration", "motion_quantity", ["acceleration", "accelerate"]),
  concept("velocity", "motion_quantity", ["velocity"]),
  concept("pressure", "mechanics_quantity", ["pressure"]),
  concept("mass", "mechanics_quantity", ["mass"]),
  concept("weight", "mechanics_quantity", ["weight"]),
  concept("force", "mechanics_quantity", ["force", "newton", "newtons"]),
  concept("voltage", "electricity_quantity", ["voltage", "potential difference", "volts"]),
  concept("current", "electricity_quantity", ["current", "amperes"]),
  concept("resistance", "electricity_quantity", ["resistance", "ohms"]),
  concept("acid", "chemistry_substance", ["acid", "acids", "acidic"]),
  concept("base", "chemistry_substance", ["base", "bases", "alkali", "alkaline"]),
  concept("photosynthesis", "biology_process", ["photosynthesis"]),
  concept("respiration", "biology_process", ["respiration"]),
  concept("mitosis", "cell_division", ["mitosis"]),
  concept("meiosis", "cell_division", ["meiosis"]),
  concept("noun", "grammar_concept", ["noun", "nouns"]),
  concept("adjective", "grammar_concept", ["adjective", "adjectives"]),
  concept("main_idea", "reading_concept", ["main idea", "central point"]),
  concept("inference", "reading_concept", ["inference", "infer"]),
  concept("ratio", "comparison_math", ["ratio", "ratios"]),
  concept("percentage", "comparison_math", ["percentage", "percent", "percentages"]),
  concept("mean", "statistics_concept", ["arithmetic mean", "average"]),
  concept("median", "statistics_concept", ["median"]),
  concept("food_chain", "ecology_sequence", ["food chain", "food chains"]),
  concept("food_web", "ecology_sequence", ["food web", "food webs"]),
  concept("conduction", "heat_transfer", ["conduction"]),
  concept("convection", "heat_transfer", ["convection"]),
];

export function evaluateRetrievalSufficiency(
  input: EvaluateRetrievalSufficiencyInput
): RetrievalSufficiency {
  const requestRequirements = buildRequestRequirements(input.query);
  const requestIntent = classifyGroundingRequestIntent(input.query);

  if (input.candidates.length === 0) {
    return insufficient("NO_RESULTS", "LOW", []);
  }

  const selected = input.selectedChunks;
  if (selected.length === 0) {
    return insufficient("LOW_RELEVANCE", "LOW", []);
  }

  if (!selected.every((chunk) => matchesFilters(chunk, input))) {
    return insufficient("FILTERED_CORPUS_GAP", "LOW", []);
  }

  if (requestsTimeSensitiveExternalInformation(input.query)) {
    return insufficient("FILTERED_CORPUS_GAP", "LOW", selected);
  }

  const compatibility = evaluateConceptCompatibility(input.query, selected);
  if (!compatibility.compatible) {
    return insufficient(compatibility.reason, "LOW", selected);
  }

  if (hasResourceInstructionConflict(input.query, selected)) {
    return insufficient("USER_INSTRUCTION_CONFLICT", "LOW", selected);
  }

  if (hasUnsupportedElaborationGap(input.query, selected)) {
    return insufficient("LOW_RELEVANCE", "LOW", selected);
  }

  if (hasMissingRequestRequirementSupport(requestRequirements, selected)) {
    return insufficient("REQUIRED_COMPARISON_SIDE_MISSING", "LOW", selected);
  }

  if (hasMissingMultiOptionComparisonInput(input.query, selected)) {
    return insufficient("REQUIRED_INPUT_MISSING", "LOW", selected);
  }

  if (hasRequiredFormulaInputGap(input.query, selected)) {
    return insufficient("REQUIRED_INPUT_MISSING", "LOW", selected);
  }

  if (hasMissingRequestedSymbolDefinition(input.query, selected)) {
    return insufficient("REQUIRED_SYMBOL_DEFINITION_MISSING", "LOW", selected);
  }

  if (hasStructuredConflict(input.query, selected)) {
    return insufficient("RESOURCE_CONFLICT", "LOW", selected);
  }

  if (hasCompleteFormulaSupport(input.query, selected)) {
    return {
      sufficient: true,
      confidence: "HIGH",
      reason: "SUPPORTED",
      selectedChunks: selected,
      policyVersion: SUFFICIENCY_POLICY_VERSION,
    };
  }

  if (
    requestIntent === "CONCEPT_DEFINITION" &&
    !hasDirectShortDefinitionSupport(input.query, selected)
  ) {
    return insufficient("REQUIRED_CONCEPT_MISSING", "LOW", selected);
  }

  if (hasDirectShortDefinitionSupport(input.query, selected)) {
    return {
      sufficient: true,
      confidence: "HIGH",
      reason: "SUPPORTED",
      selectedChunks: selected,
      policyVersion: SUFFICIENCY_POLICY_VERSION,
      evidenceShape: "DIRECT_SHORT_DEFINITION_SUPPORT",
    };
  }

  const hasDecisiveExactSupport = selected.some(hasDecisiveExactEvidence);
  if (!hasDecisiveExactSupport && hasLowHighSignalTermCoverage(input.query, selected)) {
    return insufficient("LOW_RELEVANCE", "LOW", selected);
  }

  const top = selected[0];
  const hasKeywordEvidence = selected.some(
    (chunk) =>
      (chunk.keywordScore !== null && chunk.keywordScore >= MIN_KEYWORD_SCORE) ||
      chunk.exactSignals.length > 0
  );
  const hasVectorEvidence = selected.some(
    (chunk) =>
      chunk.vectorDistance !== null &&
      Number.isFinite(chunk.vectorDistance) &&
      chunk.vectorDistance <= MAX_LOW_VECTOR_DISTANCE
  );
  const hasStrongRank = top.bestBranchRank <= 5 || top.fusionScore > 0.025;
  const hasExactSignal =
    hasDecisiveExactSupport ||
    selected.some((chunk) => chunk.exactSignals.length > 0);
  const topTwoSeparated =
    input.candidates.length < 2 ||
    top.fusionScore - input.candidates[1].fusionScore >= 0.0005 ||
    top.bestBranchRank <= input.candidates[1].bestBranchRank;

  if (!(hasKeywordEvidence || hasVectorEvidence || hasExactSignal) || !hasStrongRank) {
    return insufficient("LOW_RELEVANCE", "LOW", selected);
  }

  const confidence: GroundingConfidence =
    hasExactSignal || (hasKeywordEvidence && hasVectorEvidence && topTwoSeparated)
      ? "HIGH"
      : hasKeywordEvidence || hasVectorEvidence
        ? "MEDIUM"
        : "LOW";

  return {
    sufficient: confidence !== "LOW",
    confidence,
    reason: confidence === "LOW" ? "LOW_RELEVANCE" : "SUPPORTED",
    selectedChunks: confidence === "LOW" ? [] : selected,
    policyVersion: SUFFICIENCY_POLICY_VERSION,
  };
}

export function classifyGroundingRequestIntent(
  query: string
): GroundingRequestIntent {
  const requirements = buildRequestRequirements(query);
  if (
    requirements.some((requirement) => requirement.kind === "MULTI_OPTION_COMPARISON") ||
    isMultiOptionComparisonRequest(query)
  ) {
    return "MULTI_OPTION_COMPARISON";
  }
  if (requirements.some((requirement) => requirement.kind === "COMPARISON")) {
    return "COMPARISON";
  }
  if (isCalculationRequest(query)) return "CALCULATION";
  if (requestsFormulaWithSymbolDefinitions(query)) {
    return "FORMULA_WITH_SYMBOL_DEFINITIONS";
  }
  if (extractRequestedSymbolDefinition(query)) return "SYMBOL_DEFINITION";
  if (isFormulaRequest(query)) return "FORMULA_REQUEST";
  if (isDirectConceptDefinitionRequest(query)) return "CONCEPT_DEFINITION";
  return "GENERAL";
}

export function buildRequestRequirements(query: string): RequestRequirement[] {
  const currentText = currentDefinitionIntentText(query);
  const requirements: RequestRequirement[] = [];
  const comparison = extractComparisonSides(currentText);
  if (comparison.length >= 2) {
    requirements.push({ kind: "COMPARISON", sides: comparison.slice(0, 2) });
  }

  const options = extractMultiOptionComparisonOptions(currentText);
  if (options.length >= 2) {
    requirements.push({ kind: "MULTI_OPTION_COMPARISON", options });
  }

  const symbol = extractRequestedSymbolDefinition(currentText);
  if (requestsFormulaWithSymbolDefinitions(query) || symbol) {
    requirements.push({
      kind: "FORMULA_WITH_SYMBOLS",
      quantity: extractFormulaQuantity(query),
      symbols: symbol ? [symbol] : [],
    });
  } else if (isFormulaRequest(query)) {
    requirements.push({ kind: "FORMULA", quantity: extractFormulaQuantity(query) });
  }

  if (isCalculationRequest(currentText)) {
    requirements.push({
      kind: "CALCULATION",
      quantity: extractFormulaQuantity(query),
      requiredInputs: [],
    });
  }

  return requirements;
}

function concept(id: string, group: string, aliases: string[]): ConceptDefinition {
  return { id, group, aliases };
}

function requestsTimeSensitiveExternalInformation(query: string) {
  const normalized = normalizeForConceptMatching(
    normalizeQueryForTermCoverage(query)
  );
  const hasElectricityContext =
    /\b(?:ampere|amperes|circuit|current electricity|electricity|ohm|ohms|resistance|voltage|volts)\b/.test(
      normalized
    );
  if (hasElectricityContext) return false;

  const asksForFreshness =
    /\b(?:current|latest|newest|recent|today|this year|online|internet|web)\b/.test(
      normalized
    );
  const asksForExternalAcademicFact =
    /\b(?:waec|exam|paper|question|questions|answer|answers|discovery|discoveries|news|official)\b/.test(
      normalized
    );

  return asksForFreshness && asksForExternalAcademicFact;
}

function evaluateConceptCompatibility(query: string, chunks: RetrievedChunk[]) {
  const queryText = normalizeForConceptMatching(
    normalizeQueryForTermCoverage(query)
  );
  const chunkTexts = chunks.map((chunk) =>
    normalizeForConceptMatching(
      [
        chunk.resourceTitle,
        chunk.title,
        chunk.questionNumber ? `question ${chunk.questionNumber}` : "",
        chunk.chunkType,
        chunk.content,
      ].join(" ")
    )
  );
  const evidenceText = chunkTexts.join(" ");
  const requiredConcepts = conceptsInText(queryText);

  if (requiredConcepts.length === 0) {
    return { compatible: true as const };
  }

  for (const concept of requiredConcepts) {
    if (conceptAppears(concept, evidenceText)) continue;
    const siblingEvidence = CONCEPT_DEFINITIONS.some(
      (candidate) =>
        candidate.group === concept.group &&
        candidate.id !== concept.id &&
        conceptAppears(candidate, evidenceText)
    );

    return {
      compatible: false as const,
      reason: siblingEvidence
        ? ("CONCEPT_MISMATCH" as const)
        : ("REQUIRED_CONCEPT_MISSING" as const),
    };
  }

  const conceptsByGroup = new Map<string, ConceptDefinition[]>();
  for (const concept of requiredConcepts) {
    const existing = conceptsByGroup.get(concept.group) ?? [];
    existing.push(concept);
    conceptsByGroup.set(concept.group, existing);
  }

  for (const concepts of conceptsByGroup.values()) {
    if (concepts.length < 2) continue;
    const allSupportedInOneChunk = chunkTexts.some((chunkText) =>
      concepts.every((item) => conceptAppears(item, chunkText))
    );
    if (!allSupportedInOneChunk) {
      return {
        compatible: false as const,
        reason: "CONCEPT_MISMATCH" as const,
      };
    }
  }

  return { compatible: true as const };
}

function conceptsInText(text: string) {
  return CONCEPT_DEFINITIONS.filter((definition) =>
    conceptAppears(definition, text)
  );
}

function hasMissingRequestRequirementSupport(
  requirements: RequestRequirement[],
  chunks: RetrievedChunk[]
) {
  return requirements.some((requirement) => {
    if (requirement.kind !== "COMPARISON") return false;
    return !comparisonSidesSupported(requirement.sides, chunks);
  });
}

function comparisonSidesSupported(sides: string[], chunks: RetrievedChunk[]) {
  const evidenceSentences = chunks
    .flatMap((chunk) => chunk.content.split(/[.!?;]+/))
    .map(normalizeForConceptMatching)
    .filter(Boolean);
  return sides.every((side) => sideSupportedByEvidence(side, evidenceSentences));
}

function sideSupportedByEvidence(side: string, evidenceSentences: string[]) {
  const variants = sideVariants(side);
  return evidenceSentences.some(
    (sentence) =>
      variants.some((variant) => phraseAppears(variant, sentence)) &&
      !sentenceOnlyReportsMissingSideSupport(sentence)
  );
}

function sentenceOnlyReportsMissingSideSupport(sentence: string) {
  return /\b(?:does not|doesn t|do not|not|no)\s+(?:describe|define|explain|state|states|mention|include|cover|contain|give|provide)\b/.test(
    sentence
  ) || /\b(?:omits?|missing|undefined|not defined)\b/.test(sentence);
}

function sideVariants(side: string) {
  const normalized = normalizeForConceptMatching(side);
  const variants = new Set([normalized]);
  if (normalized.endsWith("ies") && normalized.length > 3) {
    variants.add(`${normalized.slice(0, -3)}y`);
  }
  if (normalized.endsWith("es") && normalized.length > 2) {
    variants.add(normalized.slice(0, -2));
  }
  if (normalized.endsWith("s") && normalized.length > 1) {
    variants.add(normalized.slice(0, -1));
  } else if (normalized) {
    variants.add(`${normalized}s`);
  }
  return Array.from(variants).filter(Boolean);
}

function extractComparisonSides(text: string) {
  const normalized = normalizeForConceptMatching(text);
  if (/\bcompare\b.+\busing\b.+\bto\b/.test(normalized)) return [];
  const patterns = [
    /\bcompare\s+(.+?)\s+(?:and|with|to)\s+(.+?)(?:\s+using\b|\s+from\b|\s+in\b|\s+on\b|$)/i,
    /\bdifference\s+between\s+(.+?)\s+and\s+(.+?)(?:\s+using\b|\s+from\b|\s+in\b|\s+on\b|$)/i,
    /\bcontrast\s+(.+?)\s+(?:and|with)\s+(.+?)(?:\s+using\b|\s+from\b|\s+in\b|\s+on\b|$)/i,
    /\b(.+?)\s+versus\s+(.+?)(?:\s+using\b|\s+from\b|\s+in\b|\s+on\b|$)/i,
    /\bhow\s+is\s+(.+?)\s+different\s+from\s+(.+?)(?:\s+using\b|\s+from\b|\s+in\b|\s+on\b|$)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const left = cleanComparisonSide(match?.[1] ?? "");
    const right = cleanComparisonSide(match?.[2] ?? "");
    if (left && right && left !== right) return [left, right];
  }

  return [];
}

function cleanComparisonSide(value: string) {
  return normalizeForConceptMatching(value)
    .replace(
      /\b(?:the|a|an|these|those|two|main|note|card|source|resource|blood vessel|blood vessels)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function extractMultiOptionComparisonOptions(text: string) {
  const normalized = normalizeForConceptMatching(text);
  if (!isMultiOptionComparisonRequest(normalized)) {
    return [];
  }

  const options = Array.from(
    normalized.matchAll(/\b(?:option|pack|plan|crate|bundle|tin|box)\s+([a-z0-9]+)\b/g),
    (match) => match[1] ?? ""
  ).filter(Boolean);
  return Array.from(new Set(options));
}

function isMultiOptionComparisonRequest(text: string) {
  const normalized = normalizeForConceptMatching(text);
  return /\b(?:better value|best value|cheaper per|lower unit|less per|costs less per|costs? less per|lower cost per|lowest cost per|cheaper|better per)\b/.test(
    normalized
  );
}

function hasMissingMultiOptionComparisonInput(
  query: string,
  chunks: RetrievedChunk[]
) {
  if (!isMultiOptionComparisonRequest(query)) return false;
  const evidence = normalizeForConceptMatching(
    chunks.map((chunk) => chunk.content).join(" ")
  );
  return /\b(?:does not|doesn t|do not|not|no)\s+(?:state|states|give|provide|list|include)\b.{0,80}\b(?:amount|count|gb|items?|number|pages?|pens?|bottles?|litres?|liters?|quantity)\b/.test(
    evidence
  ) || /\b(?:omits?|missing)\b.{0,80}\b(?:amount|count|gb|items?|number|pages?|pens?|bottles?|litres?|liters?|quantity)\b/.test(
    evidence
  );
}

function extractFormulaQuantity(query: string) {
  const normalized = currentDefinitionIntentText(query);
  const match = normalized.match(/\b([a-z][a-z ]{1,40})\s+(?:formula|equation)\b/i);
  return match?.[1]?.trim() ?? null;
}

function conceptAppears(definition: ConceptDefinition, text: string) {
  return definition.aliases.some((alias) => phraseAppears(alias, text));
}

function phraseAppears(phrase: string, text: string) {
  const normalized = normalizeForConceptMatching(phrase);
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

function normalizeForConceptMatching(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasDecisiveExactEvidence(chunk: RetrievedChunk) {
  if (chunk.exactSignals.length === 0 || chunk.bestBranchRank > 10) return false;

  const signalText = chunk.exactSignals.join(" ");
  if (/\b(?:expression|unit|phrase):/.test(signalText)) {
    return true;
  }

  if (
    chunk.chunkType === "FORMULA_REFERENCE" &&
    /\b(?:expression|unit|phrase):/.test(signalText)
  ) {
    return true;
  }

  if (chunk.questionNumber && /\bquestion:/.test(signalText)) {
    return true;
  }

  return false;
}

function hasDirectShortDefinitionSupport(query: string, chunks: RetrievedChunk[]) {
  const queryText = normalizeForConceptMatching(
    normalizeQueryForTermCoverage(query)
  );
  const requestedConcepts = conceptsInText(queryText);
  if (requestedConcepts.length === 0) return false;

  const evidenceText = chunks
    .map((chunk) =>
      [
        chunk.resourceTitle,
        chunk.title,
        chunk.questionNumber ? `question ${chunk.questionNumber}` : "",
        chunk.content,
      ]
        .filter(Boolean)
        .join(". ")
    )
    .join(". ");

  return requestedConcepts.every((concept) =>
    concept.aliases.some((alias) =>
      hasDirectDefinitionPattern(normalizeForConceptMatching(alias), evidenceText)
    )
  );
}

function isDirectConceptDefinitionRequest(query: string) {
  const queryText = currentDefinitionIntentText(query);
  const requestedConcepts = conceptsInText(queryText);
  if (requestedConcepts.length === 0) return false;

  if (/\b(?:define|definition|meaning)\b/.test(queryText)) return true;

  return requestedConcepts.some((concept) =>
    concept.aliases.some((alias) => {
      const escaped = normalizeForConceptMatching(alias).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      return (
        new RegExp(
          `\\bwhat\\s+(?:is|are)\\s+(?:a\\s+|an\\s+|the\\s+)?${escaped}\\b`,
          "i"
        ).test(queryText) ||
        new RegExp(`\\bwhat\\s+does\\s+${escaped}\\s+mean\\b`, "i").test(
          queryText
        )
      );
    })
  );
}

function requestsFormulaWithSymbolDefinitions(query: string) {
  const queryText = currentDefinitionIntentText(query);
  const asksForFormulaOutput =
    /\b(?:give|state|write|teach|explain|show|provide)\b.*\b(?:formula|equation)\b/i.test(
      queryText
    ) ||
    /\b(?:formula|equation)\b.*\b(?:define|variables?|symbols?)\b/i.test(
      queryText
    ) ||
    /\b(?:give|state|write|show|provide)\b[^.?!]*[a-z]\s*=\s*[^.?!]+/i.test(
      query
    );
  if (!asksForFormulaOutput) return false;

  return (
    /\b(?:define|name|state|explain|give)\s+(?:the\s+)?(?:variables?|symbols?)\b/i.test(
      queryText
    ) ||
    /\b(?:where|with)\s+[a-z]\s+(?:means|represents|stands\s+for|denotes|is)\b/i.test(
      queryText
    ) ||
    extractRequestedSymbolDefinition(queryText) !== null
  );
}

function isFormulaRequest(query: string) {
  const queryText = normalizeForConceptMatching(normalizeQueryForTermCoverage(query));
  return /\b(?:formula|equation)\b/.test(queryText) || /[a-z]\s*=\s*[^.?!]+/i.test(query);
}

function currentDefinitionIntentText(query: string) {
  const withoutMetadata = query
    .replace(/\bSubject:\s*[^.]+\.?/gi, " ")
    .replace(/\bTopic:\s*[^.]+\.?/gi, " ");
  const segments = withoutMetadata
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const currentSegment = segments.at(-1) ?? withoutMetadata;
  return normalizeForConceptMatching(currentSegment);
}

function hasDirectDefinitionPattern(alias: string, evidenceText: string) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const normalizedEvidence = evidenceText
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}.!?;]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return new RegExp(
    `(^|[.!?;]\\s+)(?:a |an |the )?${escaped}\\b\\s+(?:is|are|means|refers to|is found by|are found by|found by|called|is called|are called|can be|names|produces|shows|compares)\\b`,
    "i"
  ).test(normalizedEvidence);
}

function hasLowHighSignalTermCoverage(query: string, chunks: RetrievedChunk[]) {
  const terms = extractHighSignalTerms(query);
  if (terms.length < MIN_TERMS_FOR_COVERAGE_GATE) return false;

  const haystack = chunks
    .map((chunk) =>
      [
        chunk.resourceTitle,
        chunk.title,
        chunk.questionNumber ? `question ${chunk.questionNumber}` : "",
        chunk.chunkType,
        chunk.content,
      ].join(" ")
    )
    .join(" ")
    .toLowerCase();
  const covered = terms.filter((term) => termAppearsInText(term, haystack)).length;
  return covered / terms.length < MIN_HIGH_SIGNAL_TERM_COVERAGE;
}

function extractHighSignalTerms(query: string) {
  const normalized = normalizeQueryForTermCoverage(query)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ");
  return Array.from(new Set(normalized.split(/\s+/).filter((term) => {
    if (term.length < 4) return false;
    if (/^[0-9]+$/.test(term)) return false;
    return !HIGH_SIGNAL_STOPWORDS.has(term);
  })));
}

function termAppearsInText(term: string, haystack: string) {
  if (haystack.includes(term)) return true;
  if (haystack.includes(`${term}s`)) return true;
  if (term.endsWith("s") && haystack.includes(term.slice(0, -1))) return true;
  if (term.endsWith("y") && haystack.includes(`${term.slice(0, -1)}ies`)) return true;
  if (term.endsWith("y") && haystack.includes(`${term.slice(0, -1)}ying`)) return true;
  if (term.endsWith("e") && haystack.includes(`${term.slice(0, -1)}ing`)) return true;
  return false;
}

function normalizeQueryForTermCoverage(query: string) {
  return query
    .replace(/\bSubject:\s*[^.]+\.?/gi, " ")
    .replace(/\bTopic:\s*[^.]+\.?/gi, " ")
    .replace(/\bRelevant context:\s*/gi, " ");
}

function insufficient(
  reason: SufficiencyReason,
  confidence: GroundingConfidence,
  selectedChunks: RetrievedChunk[]
): RetrievalSufficiency {
  return {
    sufficient: false,
    confidence,
    reason,
    selectedChunks,
    policyVersion: SUFFICIENCY_POLICY_VERSION,
  };
}

function matchesFilters(
  chunk: RetrievedChunk,
  input: Pick<EvaluateRetrievalSufficiencyInput, "subjectId" | "topicId">
) {
  if (input.subjectId && chunk.subjectId !== input.subjectId) return false;
  if (input.topicId && chunk.topicId !== input.topicId) return false;
  return true;
}

function hasStructuredConflict(query: string, chunks: RetrievedChunk[]) {
  if (hasAnswerKeyConflict(query, chunks)) return true;
  if (hasDefinitionConflict(query, chunks)) return true;
  if (hasFormulaConflict(query, chunks)) return true;
  return false;
}

function hasAnswerKeyConflict(query: string, chunks: RetrievedChunk[]) {
  const requestedQuestionNumbers = extractRequestedQuestionNumbers(query);
  if (requestedQuestionNumbers.size === 0) return false;

  const answerByQuestion = new Map<string, string>();
  for (const chunk of chunks) {
    if (!chunk.questionNumber) continue;
    if (!requestedQuestionNumbers.has(chunk.questionNumber)) continue;
    const answer = extractAnswerKey(chunk.content);
    if (!answer) continue;
    const key = `${chunk.subjectId ?? ""}:${chunk.topicId ?? ""}:${chunk.questionNumber}`;
    const existing = answerByQuestion.get(key);
    if (existing && existing !== answer) return true;
    answerByQuestion.set(key, answer);
  }
  return false;
}

function hasDefinitionConflict(query: string, chunks: RetrievedChunk[]) {
  if (!/\b(?:define|definition|meaning|mean|means|refers to)\b/i.test(query)) {
    return false;
  }

  const claims = chunks.flatMap((chunk) => extractDefinitionClaims(chunk.content));
  return hasConflictingClaims(claims);
}

function hasFormulaConflict(query: string, chunks: RetrievedChunk[]) {
  if (!/\b(?:formula|calculate|calculated|calculation|work out|find)\b/i.test(query)) {
    return false;
  }

  const claims = chunks.flatMap((chunk) => extractFormulaClaims(chunk.content));
  return hasConflictingClaims(claims);
}

function hasConflictingClaims(claims: Array<{ subject: string; object: string }>) {
  for (let firstIndex = 0; firstIndex < claims.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < claims.length; secondIndex += 1) {
      const first = claims[firstIndex]!;
      const second = claims[secondIndex]!;
      if (first.subject !== second.subject) continue;
      if (!claimObjectsConflict(first.object, second.object)) continue;
      return true;
    }
  }

  return false;
}

function claimObjectsConflict(first: string, second: string) {
  if (hasMathOperator(first) || hasMathOperator(second)) {
    return normalizeMathClaim(first) !== normalizeMathClaim(second);
  }

  const firstTokens = tokenSet(first);
  const secondTokens = tokenSet(second);
  if (firstTokens.size === 0 || secondTokens.size === 0) return false;
  const overlap = Array.from(firstTokens).filter((item) => secondTokens.has(item));
  const union = new Set([...firstTokens, ...secondTokens]);
  if (overlap.length / union.size >= 0.65) return false;
  if (overlap.length >= Math.min(firstTokens.size, secondTokens.size) - 1) return false;
  return true;
}

function hasMathOperator(value: string) {
  return /[=+\-*/×]/.test(value) || /\b(?:[a-z0-9π]\s*x\s*[a-z0-9π]|times|divided by|minus|subtract(?:ed)? from)\b/i.test(value);
}

function extractDefinitionClaims(content: string) {
  const claims: Array<{ subject: string; object: string }> = [];
  const normalized = content.replace(/\s+/g, " ");
  const patterns = [
    /\b([a-z][a-z -]{1,40}?)\s+means\s+([^.!?]{8,180})/gi,
    /\b([a-z][a-z -]{1,40}?)\s+refers\s+to\s+([^.!?]{8,180})/gi,
    /\b([a-z][a-z -]{1,40}?)\s+is\s+defined\s+as\s+([^.!?]{8,180})/gi,
  ];

  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      const subject = normalizeClaimPart(match[1] ?? "");
      const object = normalizeClaimPart(match[2] ?? "");
      if (!subject || !object) continue;
      claims.push({ subject, object });
    }
  }

  return claims;
}

function extractFormulaClaims(content: string) {
  const claims: Array<{ subject: string; object: string }> = [];
  const normalized = content.replace(/\s+/g, " ");
  const patterns = [
    /\b([a-z][a-z -]{1,40}?)\s+is\s+calculated\s+by\s+([^.!?]{3,160})/gi,
    /\b([a-z][a-z -]{1,40}?)\s+formula\s+(?:is|:)\s+([^.!?]{3,160})/gi,
    /\b([a-z][a-z -]{1,40}?)\s*=\s*([^.!?]{1,80})/gi,
  ];

  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      const subject = normalizeClaimPart(match[1] ?? "");
      const object = normalizeMathClaim(match[2] ?? "");
      if (!subject || !object) continue;
      claims.push({ subject, object });
    }
  }

  return claims;
}

function normalizeClaimPart(value: string) {
  return normalizeForConceptMatching(value)
    .replace(/\b(?:card|note|reading strategy|formula|the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMathClaim(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[×*]/g, "x")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9π/%+=(). -]/g, "")
    .trim();
}

function tokenSet(value: string) {
  return new Set(
    normalizeClaimPart(value)
      .split(/\s+/)
      .filter((term) => term.length > 2 && !HIGH_SIGNAL_STOPWORDS.has(term))
  );
}

interface FormulaInputRule {
  id: string;
  queryPatterns: RegExp[];
  requiresFormulaWhen?: RegExp;
  calculationRequestPattern?: RegExp;
  formulaRequirements?: Array<{
    name: string;
    patterns: RegExp[];
    negationPatterns?: RegExp[];
  }>;
  valueRequirements?: Array<{
    name: string;
    patterns: RegExp[];
    negationPatterns?: RegExp[];
  }>;
  requirements: Array<{
    name: string;
    patterns: RegExp[];
    negationPatterns?: RegExp[];
  }>;
}

const NUMBER_VALUE = String.raw`(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)`;
const LOCAL_QUANTITY_PHRASE = String.raw`(?:\s+(?!is\b|=)[a-z0-9/]+){0,8}`;

function quantityValuePattern(quantity: string, unit: string) {
  return new RegExp(
    String.raw`\b${quantity}\b${LOCAL_QUANTITY_PHRASE}\s+(?:is|=)\s*${NUMBER_VALUE}\s*(?:${unit})\b`,
    "i"
  );
}

const FORMULA_INPUT_RULES: FormulaInputRule[] = [
  {
    id: "simple_interest",
    queryPatterns: [/\bsimple interest\b/i, /\binterest formula\b/i],
    requiresFormulaWhen: /\b(?:complete|formula|variables?|calculation|calculate|work out|find)\b/i,
    requirements: [
      { name: "principal", patterns: [/\bprincipal\b/i, /\bp\s+is\s+[0-9]/i] },
      { name: "rate", patterns: [/\brate\b/i, /\br\s+is\s+[0-9]/i, /\bpercent(?:age)?\b/i] },
      {
        name: "time",
        patterns: [/\btime\b/i, /\bperiod\b/i, /\bt\s+is\s+[0-9]/i, /\b[0-9]+\s+years?\b/i],
        negationPatterns: [/\bomits?\s+(?:the\s+)?time\b/i, /\bwithout\s+(?:the\s+)?time\b/i],
      },
      {
        name: "formula",
        patterns: [
          /\bi\s*=\s*p\s*x?\s*r\s*x?\s*t\b/i,
          /\binterest\s*=\s*principal\s*x\s*rate\s*x\s*time/i,
          /\bdivid(?:e|ed|ing)?\s+by\s+100\b/i,
        ],
        negationPatterns: [
          /\bdoes\s+not\s+state\s+(?:the\s+)?(?:full|complete)?\s*calculation\s+formula\b/i,
          /\bomits?\s+(?:the\s+)?(?:full|complete)?\s*formula\b/i,
        ],
      },
    ],
  },
  {
    id: "speed",
    queryPatterns: [/\bspeed\b/i],
    requiresFormulaWhen: /\b(?:calculate|calculation|formula|find|work out|solve|determine)\b/i,
    formulaRequirements: [
      {
        name: "formula",
        patterns: [
          /\bspeed\s+is\s+distance\s+divided\s+by\s+time\b/i,
          /\bspeed\s+is\s+calculated\s+by\s+distance\s+divided\s+by\s+time\b/i,
          /\bspeed\s*=\s*distance\s*\/\s*time\b/i,
          /\bv\s*=\s*d\s*\/\s*t\b/i,
        ],
      },
    ],
    valueRequirements: [
      {
        name: "distance",
        patterns: [
          quantityValuePattern("distance", String.raw`m|met(?:re|er)s?`),
          new RegExp(String.raw`\bdistance\s+(?:is|of|=)\s*${NUMBER_VALUE}\s*(?:m|met(?:re|er)s?)\b`, "i"),
          new RegExp(String.raw`\bcovers?\s+${NUMBER_VALUE}\s*(?:m|met(?:re|er)s?)\b`, "i"),
        ],
      },
      {
        name: "time",
        patterns: [
          quantityValuePattern("time", String.raw`s|sec|secs|seconds?`),
          new RegExp(String.raw`\btime\s+(?:is|of|=)\s*${NUMBER_VALUE}\s*(?:s|sec|secs|seconds?)\b`, "i"),
          new RegExp(String.raw`\bin\s+${NUMBER_VALUE}\s*(?:s|sec|secs|seconds?)\b`, "i"),
          new RegExp(String.raw`\bt\s*(?:=|is)\s*${NUMBER_VALUE}\s*(?:s|sec|secs|seconds?)\b`, "i"),
        ],
        negationPatterns: [/\bdoes\s+not\s+give\s+(?:the\s+)?time\b/i, /\bomits?\s+(?:the\s+)?time\b/i],
      },
    ],
    requirements: [],
  },
  {
    id: "density",
    queryPatterns: [/\bdensity\b/i],
    requiresFormulaWhen: /\b(?:calculate|calculation|formula|find|work out|solve|determine)\b/i,
    formulaRequirements: [
      {
        name: "formula",
        patterns: [
          /\bdensity\s+is\s+mass\s+divided\s+by\s+volume\b/i,
          /\bdensity\s*=\s*mass\s*\/\s*volume\b/i,
          /\bρ\s*=\s*m\s*\/\s*v\b/i,
          /\brho\s*=\s*m\s*\/\s*v\b/i,
        ],
      },
    ],
    valueRequirements: [
      {
        name: "mass",
        patterns: [
          quantityValuePattern("mass", String.raw`g|kg|grams?|kilograms?`),
          new RegExp(String.raw`\bmass\s+(?:is|of|=)\s*${NUMBER_VALUE}\s*(?:g|kg|grams?|kilograms?)\b`, "i"),
          new RegExp(String.raw`\bwith\s+mass\s+${NUMBER_VALUE}\s*(?:g|kg|grams?|kilograms?)\b`, "i"),
        ],
      },
      {
        name: "volume",
        patterns: [
          quantityValuePattern("volume", String.raw`cm3|cm\^3|m3|m\^3|litres?|liters?`),
          new RegExp(String.raw`\bvolume\s+(?:is|of|=)?\s*${NUMBER_VALUE}\s*(?:cm3|cm\^3|m3|m\^3|litres?|liters?)\b`, "i"),
          new RegExp(String.raw`\bwith\s+volume\s+${NUMBER_VALUE}\s*(?:cm3|cm\^3|m3|m\^3|litres?|liters?)\b`, "i"),
        ],
        negationPatterns: [/\bdoes\s+not\s+give\s+(?:the\s+)?volume\b/i, /\bomits?\s+(?:the\s+)?volume\b/i],
      },
    ],
    requirements: [],
  },
  {
    id: "electric_power",
    queryPatterns: [/\bpower\b/i],
    requiresFormulaWhen: /\b(?:calculate|calculation|formula|find|work out|solve|determine)\b/i,
    formulaRequirements: [
      {
        name: "formula",
        patterns: [/\bpower\s*=\s*voltage\s*x\s*current\b/i, /\bp\s*=\s*v\s*x\s*i\b/i],
      },
    ],
    valueRequirements: [
      {
        name: "voltage",
        patterns: [
          quantityValuePattern("voltage", String.raw`v|volts?`),
          quantityValuePattern("potential difference", String.raw`v|volts?`),
          new RegExp(String.raw`\bvoltage\s+(?:is|of|=)?\s*${NUMBER_VALUE}\s*v\b`, "i"),
          new RegExp(String.raw`\bpotential difference\s+(?:is|of|=)?\s*${NUMBER_VALUE}\s*v\b`, "i"),
          new RegExp(String.raw`\bpotential difference\b.{0,40}\bis\s+${NUMBER_VALUE}\s*v\b`, "i"),
          new RegExp(String.raw`\bhas\s+voltage\s+${NUMBER_VALUE}\s*v\b`, "i"),
        ],
      },
      {
        name: "current",
        patterns: [
          quantityValuePattern("current", String.raw`a|ampere|amperes|amps?`),
          new RegExp(String.raw`\bcurrent\s+(?:is|of|=)?\s*${NUMBER_VALUE}\s*(?:a|ampere|amperes|amps?)\b`, "i"),
          new RegExp(String.raw`\bcurrent\b.{0,30}\bis\s+${NUMBER_VALUE}\s*(?:a|ampere|amperes|amps?)\b`, "i"),
          new RegExp(String.raw`\bhas\s+current\s+${NUMBER_VALUE}\s*(?:a|ampere|amperes|amps?)\b`, "i"),
        ],
        negationPatterns: [/\bdoes\s+not\s+give\s+(?:the\s+)?current\b/i, /\bomits?\s+(?:the\s+)?current\b/i],
      },
    ],
    requirements: [],
  },
  {
    id: "force",
    queryPatterns: [/\bforce\b/i, /\bresultant force\b/i],
    requiresFormulaWhen: /\b(?:calculate|calculation|formula|find|work out|solve|determine)\b/i,
    formulaRequirements: [
      {
        name: "formula",
        patterns: [
          /\bf\s*=\s*m\s*x\s*a\b/i,
          /\bforce\s+(?:equals|is)\s+mass\s+(?:times|multiplied\s+by|x)\s+acceleration\b/i,
        ],
      },
    ],
    valueRequirements: [
      {
        name: "mass",
        patterns: [
          quantityValuePattern("mass", String.raw`kg|kilograms?`),
          new RegExp(String.raw`\bmass\s+(?:is|of|=)\s*${NUMBER_VALUE}\s*(?:kg|kilograms?)\b`, "i"),
          new RegExp(String.raw`\bm\s*(?:=|is)\s*${NUMBER_VALUE}\s*(?:kg|kilograms?)\b`, "i"),
        ],
      },
      {
        name: "acceleration",
        patterns: [
          quantityValuePattern("acceleration", String.raw`m/s2|m/s\^2|met(?:re|er)s?\s+per\s+second\s+squared`),
          new RegExp(String.raw`\bacceleration\s+(?:is|of|=)\s*${NUMBER_VALUE}\s*(?:m/s2|m/s\^2|met(?:re|er)s?\s+per\s+second\s+squared)\b`, "i"),
          new RegExp(String.raw`\ba\s*(?:=|is)\s*${NUMBER_VALUE}\s*(?:m/s2|m/s\^2|met(?:re|er)s?\s+per\s+second\s+squared)\b`, "i"),
        ],
        negationPatterns: [/\bdoes\s+not\s+give\s+(?:the\s+)?acceleration\b/i, /\bomits?\s+(?:the\s+)?acceleration\b/i],
      },
    ],
    requirements: [],
  },
  {
    id: "pressure",
    queryPatterns: [/\bpressure\b/i],
    requiresFormulaWhen: /\b(?:formula|equation|units?|calculate|calculation|find|work out|solve|determine)\b/i,
    formulaRequirements: [
      {
        name: "formula",
        patterns: [
          /\bp\s*=\s*f\s*\/\s*a\b/i,
          /\bpressure\s*=\s*force\s*\/\s*area\b/i,
          /\bpressure\s+is\s+force\s+divided\s+by\s+area\b/i,
        ],
      },
      {
        name: "force_unit",
        patterns: [/\bnewtons?\b/i, /\bn\b/i],
      },
      {
        name: "area_unit",
        patterns: [/\bsquare\s+met(?:re|er)s?\b/i, /\bm\^?2\b/i],
      },
    ],
    valueRequirements: [
      {
        name: "force",
        patterns: [
          quantityValuePattern("force", String.raw`n|newtons?`),
          new RegExp(String.raw`\bf\s*(?:=|is)\s*${NUMBER_VALUE}\s*(?:n|newtons?)\b`, "i"),
        ],
      },
      {
        name: "area",
        patterns: [
          quantityValuePattern("area", String.raw`m2|m\^2|square\s+met(?:re|er)s?`),
          new RegExp(String.raw`\ba\s*(?:=|is)\s*${NUMBER_VALUE}\s*(?:m2|m\^2|square\s+met(?:re|er)s?)\b`, "i"),
        ],
      },
    ],
    requirements: [],
  },
  {
    id: "percentage_change",
    queryPatterns: [/\bpercentage change\b/i, /\bpercent(?:age)?\s+change\b/i],
    requiresFormulaWhen: /\b(?:calculate|calculation|formula|find|work out|solve|determine)\b/i,
    formulaRequirements: [
      {
        name: "formula",
        patterns: [
          /\bpercentage change\s*=\s*change\s*\/\s*original value\s*x\s*100\b/i,
          /\bpercent(?:age)? change\s*=\s*\(\s*new\s*-\s*original\s*\)\s*\/\s*original\s*x\s*100\b/i,
          /\bcompares\s+a\s+change\s+with\s+the\s+original value\b/i,
        ],
      },
    ],
    valueRequirements: [
      {
        name: "change_or_new_value",
        patterns: [
          new RegExp(String.raw`\bchange\s+(?:is|of|=)\s*${NUMBER_VALUE}\b`, "i"),
          new RegExp(String.raw`\bnew\s+value\s+(?:is|of|=)\s*${NUMBER_VALUE}\b`, "i"),
        ],
      },
      {
        name: "original",
        patterns: [
          new RegExp(String.raw`\boriginal value\s+(?:is|of|=)\s*${NUMBER_VALUE}\b`, "i"),
          new RegExp(String.raw`\bfrom\s+an?\s+original value\s+of\s+${NUMBER_VALUE}\b`, "i"),
        ],
        negationPatterns: [/\bdoes\s+not\s+give\s+(?:the\s+)?original value\b/i, /\bomits?\s+(?:the\s+)?original value\b/i],
      },
    ],
    requirements: [],
  },
  {
    id: "work_done",
    queryPatterns: [/\bwork done\b/i, /\bwork\s+formula\b/i],
    requiresFormulaWhen: /\b(?:formula|explain|variables?|symbols?|calculate|find)\b/i,
    requirements: [
      { name: "force", patterns: [/\bforce\b/i, /\bf\b/i] },
      { name: "distance", patterns: [/\bdistance\b/i, /\bd\b/i] },
      { name: "formula", patterns: [/\bw\s*=\s*f\s*x\s*d\b/i, /\bwork done\s+is\s+calculated\b/i] },
    ],
  },
  {
    id: "concentration_by_mass",
    queryPatterns: [/\bconcentration\b/i],
    requiresFormulaWhen: /\b(?:formula|units?|calculate|find)\b/i,
    requirements: [
      { name: "mass", patterns: [/\bmass\b/i, /\bsolute\b/i] },
      { name: "volume", patterns: [/\bvolume\b/i, /\bsolution\b/i] },
      { name: "formula", patterns: [/\bconcentration\s*=\s*mass\b/i] },
    ],
  },
];

function hasRequiredFormulaInputGap(query: string, chunks: RetrievedChunk[]) {
  const evidence = chunks.map((chunk) => chunk.content).join(" ");
  const matchingRules = formulaRulesMatchingQuery(query);
  if (matchingRules.length === 0) return false;
  if (matchingRules.some((rule) => formulaRuleRequirementsSupported(rule, query, chunks, evidence))) {
    return false;
  }

  return matchingRules.some((rule) => {
    if (rule.id === "simple_interest") {
      return !simpleInterestRequirementsSupported(query, chunks);
    }
    return requiredFormulaRuleRequirements(rule, query).some(
      (requirement) => !requirementSupported(requirement, evidence)
    );
  });
}

function hasCompleteFormulaSupport(query: string, chunks: RetrievedChunk[]) {
  const evidence = chunks.map((chunk) => chunk.content).join(" ");
  return formulaRulesMatchingQuery(query).some((rule) =>
    formulaRuleRequirementsSupported(rule, query, chunks, evidence)
  );
}

function formulaRulesMatchingQuery(query: string) {
  return FORMULA_INPUT_RULES.filter((rule) => {
    if (!rule.queryPatterns.some((pattern) => pattern.test(query))) return false;
    if (rule.requiresFormulaWhen && !rule.requiresFormulaWhen.test(query)) return false;
    return true;
  });
}

function formulaRuleRequirementsSupported(
  rule: FormulaInputRule,
  query: string,
  chunks: RetrievedChunk[],
  evidence: string
) {
  if (rule.id === "simple_interest") {
    return simpleInterestRequirementsSupported(query, chunks);
  }
  return requiredFormulaRuleRequirements(rule, query).every((requirement) =>
    requirementSupported(requirement, evidence)
  );
}

function requiredFormulaRuleRequirements(rule: FormulaInputRule, query: string) {
  const calculationRequest =
    rule.calculationRequestPattern?.test(query) ?? isCalculationRequest(query);
  return [
    ...(rule.formulaRequirements ?? rule.requirements),
    ...(calculationRequest ? rule.valueRequirements ?? [] : []),
  ];
}

function isCalculationRequest(query: string) {
  return /\b(?:calculate|calculation|solve|work out|determine)\b/i.test(query);
}

function simpleInterestRequirementsSupported(
  query: string,
  chunks: RetrievedChunk[]
) {
  const scopedChunks = scopeSimpleInterestEvidence(query, chunks);
  const support = scopedChunks.reduce(
    (current, chunk) => mergeSimpleInterestSupport(current, extractSimpleInterestSupport(chunk.content)),
    emptySimpleInterestSupport()
  );
  const requiresCalculation = /\b(?:calculate|calculation|work out|find)\b/i.test(query);
  const principal = requiresCalculation ? support.principalValue : support.principal;
  const rate = requiresCalculation ? support.rateValue : support.rate;
  const time = requiresCalculation ? support.timeValue : support.time;

  return support.formula && principal && rate && time;
}

function scopeSimpleInterestEvidence(query: string, chunks: RetrievedChunk[]) {
  const topChunk = chunks[0];
  if (
    topChunk &&
    /\bthis\s+(?:card|source|note|resource)\b/i.test(query) &&
    hasSimpleInterestInputOmission(topChunk.content)
  ) {
    return [topChunk];
  }

  return chunks;
}

function hasSimpleInterestInputOmission(evidence: string) {
  return [
    /\bomits?\s+(?:the\s+)?time\b/i,
    /\bwithout\s+(?:the\s+)?time\b/i,
    /\bdoes\s+not\s+state\s+(?:the\s+)?(?:full|complete)?\s*calculation\s+formula\b/i,
    /\bomits?\s+(?:the\s+)?(?:full|complete)?\s*formula\b/i,
    /\bprincipal\s+and\s+rate\s+only\b/i,
  ].some((pattern) => pattern.test(evidence));
}

interface SimpleInterestSupport {
  formula: boolean;
  principal: boolean;
  principalValue: boolean;
  rate: boolean;
  rateValue: boolean;
  time: boolean;
  timeValue: boolean;
}

function emptySimpleInterestSupport(): SimpleInterestSupport {
  return {
    formula: false,
    principal: false,
    principalValue: false,
    rate: false,
    rateValue: false,
    time: false,
    timeValue: false,
  };
}

function mergeSimpleInterestSupport(
  left: SimpleInterestSupport,
  right: SimpleInterestSupport
): SimpleInterestSupport {
  return {
    formula: left.formula || right.formula,
    principal: left.principal || right.principal,
    principalValue: left.principalValue || right.principalValue,
    rate: left.rate || right.rate,
    rateValue: left.rateValue || right.rateValue,
    time: left.time || right.time,
    timeValue: left.timeValue || right.timeValue,
  };
}

function extractSimpleInterestSupport(evidence: string): SimpleInterestSupport {
  const text = normalizeForConceptMatching(evidence);
  const mathText = normalizeMathClaim(evidence);
  const principalValue = hasPrincipalValue(text, mathText);
  const rateValue = hasRateValue(text, mathText);
  const timeValue = hasTimeValue(text, mathText);

  return {
    formula: hasSimpleInterestFormula(mathText, text),
    principal: principalValue || hasPrincipalVariableDefinition(text, mathText),
    principalValue,
    rate: rateValue || hasRateVariableDefinition(text, mathText),
    rateValue,
    time: timeValue || hasTimeVariableDefinition(text, mathText),
    timeValue,
  };
}

function hasSimpleInterestFormula(mathText: string, text: string) {
  return (
    /\bi\s*=\s*p\s*x\s*r\s*x\s*t\s*\/\s*100\b/i.test(mathText) ||
    /\binterest\s+principal\s+x\s+rate\s+x\s+time\s+\/\s+100\b/i.test(mathText) ||
    (/\bsimple interest formula\b/i.test(text) &&
      /\bi\s*=\s*p\s*x\s*r\s*x\s*t\b/i.test(mathText) &&
      /\/\s*100\b/.test(mathText))
  );
}

function hasPrincipalVariableDefinition(text: string, mathText: string) {
  return (
    /\bp\s+(?:is|means|represents|denotes)\s+(?:the\s+)?principal\b/i.test(text) ||
    /\bp\s*=\s*principal\b/i.test(mathText)
  );
}

function hasRateVariableDefinition(text: string, mathText: string) {
  return (
    /\br\s+(?:is|means|represents|denotes)\s+(?:the\s+)?rate\b/i.test(text) ||
    /\br\s*=\s*rate\b/i.test(mathText)
  );
}

function hasTimeVariableDefinition(text: string, mathText: string) {
  return (
    /\bt\s+(?:is|means|represents|denotes)\s+(?:the\s+)?time\b/i.test(text) ||
    /\bt\s*=\s*time\b/i.test(mathText)
  );
}

function hasPrincipalValue(text: string, mathText: string) {
  return (
    new RegExp(String.raw`\bp\s*(?:=|is)\s*${NUMBER_VALUE}\b`, "i").test(mathText) ||
    new RegExp(String.raw`\bprincipal(?:\s+amount)?\s+(?:is|of|=)\s*${NUMBER_VALUE}\b`, "i").test(text)
  );
}

function hasRateValue(text: string, mathText: string) {
  return (
    new RegExp(String.raw`\br\s*(?:=|is)\s*${NUMBER_VALUE}\s*(?:%|percent|percentage)?\b`, "i").test(mathText) ||
    new RegExp(String.raw`\brate\s+(?:is|of|=)\s*${NUMBER_VALUE}\s*(?:%|percent|percentage)\b`, "i").test(text)
  );
}

function hasTimeValue(text: string, mathText: string) {
  return (
    new RegExp(String.raw`\bt\s*(?:=|is)\s*${NUMBER_VALUE}\s*(?:years?|months?)\b`, "i").test(mathText) ||
    new RegExp(String.raw`\btime\s+(?:is|of|=)\s*${NUMBER_VALUE}\s*(?:years?|months?)\b`, "i").test(text) ||
    new RegExp(String.raw`\bfor\s+${NUMBER_VALUE}\s*(?:years?|months?)\b`, "i").test(text) ||
    new RegExp(String.raw`\b${NUMBER_VALUE}\s*(?:years?|months?)\b`, "i").test(text)
  );
}

function hasMissingRequestedSymbolDefinition(
  query: string,
  chunks: RetrievedChunk[]
) {
  const requestedSymbol = extractRequestedSymbolDefinition(query);
  if (!requestedSymbol) return false;

  const evidenceText = chunks.map((chunk) => chunk.content).join(" ");
  const normalizedEvidence = normalizeForConceptMatching(evidenceText);
  if (!phraseAppears(requestedSymbol, normalizedEvidence)) return true;

  return !chunks.some((chunk) =>
    splitEvidenceSentences(chunk.content).some((sentence) =>
      hasPositiveSymbolDefinition(sentence, requestedSymbol)
    )
  );
}

function extractRequestedSymbolDefinition(query: string) {
  const normalized = normalizeForConceptMatching(
    normalizeQueryForTermCoverage(query)
  );
  const patterns = [
    /\bwhat\s+does\s+([a-z])\s+(?:mean|represent|stand\s+for)\b/i,
    /\bdefine\s+([a-z])(?:\s+(?:in|for|from|as|symbol|variable)\b|$)/i,
    /\b([a-z])\s+(?:mean|represent|stand\s+for)\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const symbol = match?.[1];
    if (symbol && !HIGH_SIGNAL_STOPWORDS.has(symbol)) return symbol;
  }

  return null;
}

function splitEvidenceSentences(value: string) {
  return value
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasPositiveSymbolDefinition(sentence: string, symbol: string) {
  const normalized = normalizeSymbolSentence(sentence);
  if (hasNegatedSymbolDefinition(sentence, symbol)) return false;

  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const term = String.raw`(?!not\b|undefined\b|unexplained\b|missing\b|given\b)[a-z][a-z0-9 /]{1,60}`;
  const positivePatterns = [
    new RegExp(String.raw`\b${escaped}\s+(?:means|represents|stands\s+for|denotes|is)\s+(?:the\s+)?${term}\b`, "i"),
    new RegExp(String.raw`\bwhere\s+${escaped}\s+(?:means|represents|stands\s+for|denotes|is)\s+(?:the\s+)?${term}\b`, "i"),
    new RegExp(String.raw`\b${escaped}\s*=\s*${term}\b`, "i"),
  ];

  return positivePatterns.some((pattern) => pattern.test(normalized));
}

function hasNegatedSymbolDefinition(sentence: string, symbol: string) {
  const normalized = normalizeSymbolSentence(sentence);
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(String.raw`\b${escaped}\s+does\s+not\s+(?:mean|represent|stand\s+for|denote)\b`, "i"),
    new RegExp(String.raw`\b${escaped}\s+(?:is|means|represents|denotes)\s+not\b`, "i"),
    new RegExp(String.raw`\b${escaped}\s+is\s+not\s+(?:defined|explained|given)\b`, "i"),
    new RegExp(String.raw`\b(?:does\s+not|doesn't|not)\s+(?:explain|define|give|state)\s+(?:what\s+)?${escaped}\b`, "i"),
    new RegExp(String.raw`\bmeaning\s+of\s+${escaped}\s+is\s+not\s+(?:given|defined|explained)\b`, "i"),
  ];

  return patterns.some((pattern) => pattern.test(normalized));
}

function normalizeSymbolSentence(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[×*]/g, "x")
    .replace(/[^a-z0-9=/%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function requirementSupported(
  requirement: FormulaInputRule["requirements"][number],
  evidence: string
) {
  const positive = requirement.patterns.some((pattern) => pattern.test(evidence));
  if (!positive) return false;
  return !requirement.negationPatterns?.some((pattern) => {
    if (!pattern.test(evidence)) return false;
    return requirement.patterns.every((positivePattern) => !positivePattern.test(
      evidence.replace(pattern, " ")
    ));
  });
}

function hasUnsupportedElaborationGap(query: string, chunks: RetrievedChunk[]) {
  const queryText = normalizeForConceptMatching(query);
  const evidenceText = normalizeForConceptMatching(
    chunks.map((chunk) => chunk.content).join(" ")
  );

  const asksFoodChainConsequence =
    phraseAppears("food chain", queryText) &&
    /\b(?:consequence|follows|if|disappears|population|increase|decrease|consumer)\b/.test(
      queryText
    );
  if (!asksFoodChainConsequence) return false;

  return !/\b(?:population|increase|decrease|disappear|disappears|removed|consumer disappears|predator|prey|consequence)\b/.test(
    evidenceText
  );
}

function hasResourceInstructionConflict(query: string, chunks: RetrievedChunk[]) {
  if (chunks.every((chunk) => !hasInstructionLikeResourceText(chunk.content))) {
    return false;
  }

  const normalizedQuery = normalizeForConceptMatching(query);
  if (/\b(?:hidden|developer|system|prompt|source_[0-9]+|override|safety|instruction)\b/.test(
    normalizedQuery
  )) {
    return true;
  }

  const asksForBenignLiteralText =
    /\b(?:quote|literal|exact text|wording)\b/.test(normalizedQuery) &&
    !/\b(?:hidden|developer|system|prompt|source|override|safety|instruction)\b/.test(
      normalizedQuery
    );
  if (asksForBenignLiteralText) return false;

  const sanitizedEvidence = chunks
    .map((chunk) => stripInstructionLikeSentences(chunk.content))
    .join(" ");
  const terms = extractHighSignalTerms(query);
  const coveredTerms = terms.filter((term) =>
    termAppearsInText(term, sanitizedEvidence.toLowerCase())
  );
  return sanitizedEvidence.trim().length < 24 || coveredTerms.length === 0;
}

function hasInstructionLikeResourceText(content: string) {
  return /\b(?:ignore\s+(?:previous|all|system|developer)?\s*instructions?|reveal\s+(?:the\s+)?(?:system\s+prompt|prompt|hidden|developer)|hidden\s+(?:developer|system)\s+instructions?|cite\s+source_[0-9]+|override\s+(?:all\s+)?(?:safety|rules|system|instructions?)|developer\s+message|system\s+prompt|answer\s+with)\b/i.test(
    content
  );
}

function stripInstructionLikeSentences(content: string) {
  return content
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !hasInstructionLikeResourceText(sentence))
    .join(" ");
}

function extractRequestedQuestionNumbers(query: string) {
  return new Set(
    Array.from(query.matchAll(/\b(?:question|q)\s*#?\s*([0-9]{1,3})\b/gi)).map(
      (match) => match[1]
    )
  );
}

function extractAnswerKey(content: string) {
  const match = content.match(/\banswer\s*:\s*([A-D]|[0-9]+(?:\.[0-9]+)?|[-a-z0-9 ]{1,80})/i);
  return match?.[1]?.trim().toLowerCase().replace(/\s+/g, " ") ?? null;
}
