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

  if (hasResourceInstructionConflict(input.query, selected)) {
    return insufficient("USER_INSTRUCTION_CONFLICT", "LOW", selected);
  }

  if (hasRequiredFormulaInputGap(input.query, selected)) {
    return insufficient("REQUIRED_INPUT_MISSING", "LOW", selected);
  }

  if (hasMissingRequestedSymbolDefinition(input.query, selected)) {
    return insufficient("LOW_RELEVANCE", "LOW", selected);
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
  return /[=+*/×]/.test(value) || /\b(?:[a-z0-9π]\s*x\s*[a-z0-9π]|times|divided by)\b/i.test(value);
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
  requirements: Array<{
    name: string;
    patterns: RegExp[];
    negationPatterns?: RegExp[];
  }>;
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
    requiresFormulaWhen: /\b(?:calculate|formula|find|work out)\b/i,
    requirements: [
      { name: "distance", patterns: [/\bdistance\b/i, /\bmet(?:re|er)s?\b/i] },
      { name: "time", patterns: [/\btime\b/i, /\bseconds?\b/i] },
    ],
  },
  {
    id: "density",
    queryPatterns: [/\bdensity\b/i],
    requiresFormulaWhen: /\b(?:calculate|formula|find|work out)\b/i,
    requirements: [
      { name: "mass", patterns: [/\bmass\b/i] },
      { name: "volume", patterns: [/\bvolume\b/i] },
    ],
  },
  {
    id: "electric_power",
    queryPatterns: [/\bpower\b/i],
    requiresFormulaWhen: /\b(?:calculate|formula|find|work out)\b/i,
    requirements: [
      { name: "voltage", patterns: [/\bvoltage\b/i, /\bpotential difference\b/i, /\b\d+\s*v\b/i] },
      { name: "current", patterns: [/\bcurrent\b/i, /\b\d+\s*a\b/i, /\bamperes?\b/i] },
      {
        name: "formula",
        patterns: [/\bpower\s*=\s*voltage\s*x\s*current\b/i, /\bp\s*=\s*v\s*x\s*i\b/i],
      },
    ],
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

  return FORMULA_INPUT_RULES.some((rule) => {
    if (!rule.queryPatterns.some((pattern) => pattern.test(query))) return false;
    if (rule.requiresFormulaWhen && !rule.requiresFormulaWhen.test(query)) return false;
    return rule.requirements.some(
      (requirement) => !requirementSupported(requirement, evidence)
    );
  });
}

function hasCompleteFormulaSupport(query: string, chunks: RetrievedChunk[]) {
  const evidence = chunks.map((chunk) => chunk.content).join(" ");
  return FORMULA_INPUT_RULES.some((rule) => {
    if (!rule.queryPatterns.some((pattern) => pattern.test(query))) return false;
    if (rule.requiresFormulaWhen && !rule.requiresFormulaWhen.test(query)) return false;
    return rule.requirements.every((requirement) =>
      requirementSupported(requirement, evidence)
    );
  });
}

function hasMissingRequestedSymbolDefinition(
  query: string,
  chunks: RetrievedChunk[]
) {
  const requestedSymbol = extractRequestedSymbolDefinition(query);
  if (!requestedSymbol) return false;

  const evidence = chunks.map((chunk) => chunk.content).join(" ");
  const normalizedEvidence = normalizeForConceptMatching(evidence);
  if (!phraseAppears(requestedSymbol, normalizedEvidence)) return true;

  const escaped = requestedSymbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const definitionPatterns = [
    new RegExp(`\\b${escaped}\\s+(?:means|represents|stands\\s+for|is)\\s+(?:the\\s+)?[a-z][a-z -]{2,60}\\b`, "i"),
    new RegExp(`\\bwhere\\s+${escaped}\\s+(?:means|represents|stands\\s+for|is)\\s+(?:the\\s+)?[a-z][a-z -]{2,60}\\b`, "i"),
    new RegExp(`\\b${escaped}\\s*=\\s*[a-z][a-z -]{2,60}\\b`, "i"),
  ];

  return !definitionPatterns.some((pattern) => pattern.test(normalizedEvidence));
}

function extractRequestedSymbolDefinition(query: string) {
  const normalized = normalizeForConceptMatching(
    normalizeQueryForTermCoverage(query)
  );
  const patterns = [
    /\bwhat\s+does\s+([a-z])\s+(?:mean|represent|stand\s+for)\b/i,
    /\bdefine\s+([a-z])\b/i,
    /\b([a-z])\s+(?:mean|represent|stand\s+for)\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const symbol = match?.[1];
    if (symbol && !HIGH_SIGNAL_STOPWORDS.has(symbol)) return symbol;
  }

  return null;
}

function requirementSupported(
  requirement: FormulaInputRule["requirements"][number],
  evidence: string
) {
  if (requirement.negationPatterns?.some((pattern) => pattern.test(evidence))) {
    return false;
  }
  return requirement.patterns.some((pattern) => pattern.test(evidence));
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
