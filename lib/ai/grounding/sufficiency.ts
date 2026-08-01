import type { RetrievedChunk } from "@/lib/resources/retrieval/types";
import { SUFFICIENCY_POLICY_VERSION } from "./config";

export type GroundingConfidence = "HIGH" | "MEDIUM" | "LOW";
export type SufficiencyReason =
  | "SUPPORTED"
  | "NO_RESULTS"
  | "LOW_RELEVANCE"
  | "FILTERED_CORPUS_GAP"
  | "POSSIBLE_CONFLICT"
  | "MISSING_REQUIRED_SOURCE_TYPE";

export interface RetrievalSufficiency {
  sufficient: boolean;
  confidence: GroundingConfidence;
  reason: SufficiencyReason;
  selectedChunks: RetrievedChunk[];
  policyVersion: string;
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
  "explain",
  "from",
  "give",
  "have",
  "help",
  "many",
  "official",
  "please",
  "question",
  "state",
  "that",
  "this",
  "today",
  "using",
  "what",
  "when",
  "where",
  "which",
  "with",
  "year",
]);

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

  if (hasStructuredConflict(selected)) {
    return insufficient("POSSIBLE_CONFLICT", "LOW", selected);
  }

  if (hasLowHighSignalTermCoverage(input.query, selected)) {
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
  const hasExactSignal = selected.some((chunk) => chunk.exactSignals.length > 0);
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
  const normalized = query
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
  if (term.endsWith("s") && haystack.includes(term.slice(0, -1))) return true;
  if (term.endsWith("y") && haystack.includes(`${term.slice(0, -1)}ies`)) return true;
  if (term.endsWith("e") && haystack.includes(`${term.slice(0, -1)}ing`)) return true;
  return false;
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

function hasStructuredConflict(chunks: RetrievedChunk[]) {
  const answerByQuestion = new Map<string, string>();
  for (const chunk of chunks) {
    if (!chunk.questionNumber) continue;
    const answer = extractAnswerKey(chunk.content);
    if (!answer) continue;
    const key = `${chunk.subjectId ?? ""}:${chunk.topicId ?? ""}:${chunk.questionNumber}`;
    const existing = answerByQuestion.get(key);
    if (existing && existing !== answer) return true;
    answerByQuestion.set(key, answer);
  }
  return false;
}

function extractAnswerKey(content: string) {
  const match = content.match(/\banswer\s*:\s*([A-D]|[0-9]+(?:\.[0-9]+)?|[-a-z0-9 ]{1,80})/i);
  return match?.[1]?.trim().toLowerCase().replace(/\s+/g, " ") ?? null;
}
