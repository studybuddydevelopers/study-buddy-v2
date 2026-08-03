import type { RetrievedChunk } from "@/lib/resources/retrieval/types";

export const DEFAULT_EVIDENCE_TOKEN_BUDGET = 1_800;
export const DEFAULT_MAX_EVIDENCE_CHUNKS = 6;

export interface LabeledEvidence {
  sourceLabel: string;
  chunk: RetrievedChunk;
  retrievalRank: number;
}

export interface SelectEvidenceInput {
  candidates: RetrievedChunk[];
  query?: string;
  tokenBudget?: number;
  maxChunks?: number;
}

export function selectGroundingEvidence(input: SelectEvidenceInput) {
  const tokenBudget = input.tokenBudget ?? DEFAULT_EVIDENCE_TOKEN_BUDGET;
  const maxChunks = input.maxChunks ?? DEFAULT_MAX_EVIDENCE_CHUNKS;
  const selected: LabeledEvidence[] = [];
  const usedResources = new Set<string>();
  let usedTokens = 0;
  const topHasExactSupport = (input.candidates[0]?.exactSignals.length ?? 0) > 0;
  const requestedQuestionNumbers = extractRequestedQuestionNumbers(input.query ?? "");

  for (const candidate of input.candidates) {
    if (selected.length >= maxChunks) break;
    if (isUnrequestedAnswerKeyCandidate(candidate, requestedQuestionNumbers)) {
      continue;
    }
    if (
      selected.length > 0 &&
      topHasExactSupport &&
      candidate.exactSignals.length === 0
    ) {
      continue;
    }
    const estimate = estimateTokens(candidate.content);
    if (selected.length > 0 && usedTokens + estimate > tokenBudget) continue;

    const duplicate = selected.some(
      (item) => item.chunk.contentHash === candidate.contentHash
    );
    if (duplicate) continue;

    const resourceAlreadyUsed = usedResources.has(candidate.resourceId);
    if (resourceAlreadyUsed && selected.length >= Math.ceil(maxChunks / 2)) {
      continue;
    }

    selected.push({
      sourceLabel: `SOURCE_${selected.length + 1}`,
      chunk: candidate,
      retrievalRank: input.candidates.indexOf(candidate) + 1,
    });
    usedResources.add(candidate.resourceId);
    usedTokens += estimate;
  }

  return selected;
}

function isUnrequestedAnswerKeyCandidate(
  candidate: RetrievedChunk,
  requestedQuestionNumbers: Set<string>
) {
  if (!candidate.questionNumber) return false;
  if (requestedQuestionNumbers.has(candidate.questionNumber)) return false;
  return /\banswer\s*:/i.test(candidate.content);
}

function extractRequestedQuestionNumbers(query: string) {
  return new Set(
    Array.from(query.matchAll(/\b(?:question|q)\s*#?\s*([0-9]{1,3})\b/gi)).map(
      (match) => match[1]
    )
  );
}

export function buildSelectedEvidenceMetadata(evidence: LabeledEvidence[]) {
  return evidence.map((item) => ({
    sourceLabel: item.sourceLabel,
    retrievalRank: item.retrievalRank,
    resourceId: item.chunk.resourceId,
    resourceTitle: item.chunk.resourceTitle,
    resourceChunkId: item.chunk.id,
    chunkIndex: item.chunk.chunkIndex,
    chunkType: item.chunk.chunkType,
    contentHash: item.chunk.contentHash,
    subjectId: item.chunk.subjectId,
    topicId: item.chunk.topicId,
    questionNumber: item.chunk.questionNumber,
    keywordRank: item.chunk.keywordRank,
    keywordScore: item.chunk.keywordScore,
    vectorRank: item.chunk.vectorRank,
    vectorDistance: item.chunk.vectorDistance,
    fusionScore: item.chunk.fusionScore,
    exactSignals: item.chunk.exactSignals.slice(0, 10),
    alternateProvenanceCount: item.chunk.alternateProvenance.length,
  }));
}

function estimateTokens(value: string) {
  return Math.max(1, Math.ceil(value.length / 4));
}
