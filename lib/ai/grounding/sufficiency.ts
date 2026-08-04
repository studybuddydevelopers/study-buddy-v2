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

const MAX_LOW_VECTOR_DISTANCE = 0.88;
const MIN_KEYWORD_SCORE = 0.01;
const MIN_HIGH_SIGNAL_TERM_COVERAGE = 0.5;
const MIN_TERMS_FOR_COVERAGE_GATE = 2;
const HIGH_SIGNAL_STOPWORDS = new Set([
  "about",
  "also",
  "answer",
  "could",
  "does",
  "explain",
  "find",
  "from",
  "give",
  "have",
  "help",
  "ignore",
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
  "using",
  "used",
  "what",
  "when",
  "where",
  "which",
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
  concept("speed", "motion_quantity", ["speed"]),
  concept("acceleration", "motion_quantity", ["acceleration", "accelerate"]),
  concept("velocity", "motion_quantity", ["velocity"]),
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

  if (hasStructuredConflict(input.query, selected)) {
    return insufficient("RESOURCE_CONFLICT", "LOW", selected);
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

  const evidenceText = normalizeForConceptMatching(
    chunks
      .map((chunk) =>
        [
          chunk.resourceTitle,
          chunk.title,
          chunk.questionNumber ? `question ${chunk.questionNumber}` : "",
          chunk.content,
        ].join(" ")
      )
      .join(" ")
  );

  return requestedConcepts.every((concept) =>
    concept.aliases.some((alias) =>
      hasDirectDefinitionPattern(normalizeForConceptMatching(alias), evidenceText)
    )
  );
}

function hasDirectDefinitionPattern(alias: string, evidenceText: string) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[^a-z0-9])(?:a |an |the )?${escaped}([^a-z0-9].{0,120})?\\b(?:is|are|means|refers to|found by|called|names|can be|produces|shows)\\b`,
    "i"
  ).test(evidenceText);
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
