import type { RetrievedChunk } from "./types";
import { DEFAULT_RRF_K } from "./types";
import { normalizedContentFingerprint } from "./search-text";

export interface MergeHybridResultsInput {
  keywordResults: RetrievedChunk[];
  vectorResults: RetrievedChunk[];
  limit: number;
  rrfK?: number;
}

export function mergeHybridResults(input: MergeHybridResultsInput) {
  const rrfK = input.rrfK ?? DEFAULT_RRF_K;
  const merged = new Map<string, RetrievedChunk>();

  for (const result of input.keywordResults) {
    const rank = result.keywordRank ?? Number.MAX_SAFE_INTEGER;
    merged.set(result.id, {
      ...result,
      fusionScore: rrfScore(rank, rrfK),
      bestBranchRank: rank,
    });
  }

  for (const result of input.vectorResults) {
    const rank = result.vectorRank ?? Number.MAX_SAFE_INTEGER;
    const existing = merged.get(result.id);
    if (existing) {
      merged.set(result.id, {
        ...existing,
        vectorRank: result.vectorRank,
        vectorDistance: result.vectorDistance,
        fusionScore: existing.fusionScore + rrfScore(rank, rrfK),
        bestBranchRank: Math.min(existing.bestBranchRank, rank),
      });
    } else {
      merged.set(result.id, {
        ...result,
        fusionScore: rrfScore(rank, rrfK),
        bestBranchRank: rank,
      });
    }
  }

  return suppressExactDuplicates(Array.from(merged.values()))
    .sort(compareRetrievedChunks)
    .slice(0, input.limit);
}

export function compareRetrievedChunks(a: RetrievedChunk, b: RetrievedChunk) {
  const scoreDelta = b.fusionScore - a.fusionScore;
  if (Math.abs(scoreDelta) > Number.EPSILON) return scoreDelta;
  if (a.bestBranchRank !== b.bestBranchRank) {
    return a.bestBranchRank - b.bestBranchRank;
  }
  const resourceDelta = a.resourceId.localeCompare(b.resourceId);
  if (resourceDelta !== 0) return resourceDelta;
  if (a.chunkIndex !== b.chunkIndex) return a.chunkIndex - b.chunkIndex;
  return a.id.localeCompare(b.id);
}

export function suppressExactDuplicates(results: RetrievedChunk[]) {
  const byFingerprint = new Map<string, RetrievedChunk>();

  for (const result of results.sort(compareRetrievedChunks)) {
    const fingerprint = normalizedContentFingerprint(result.content);
    const existing = byFingerprint.get(fingerprint);
    if (!existing) {
      byFingerprint.set(fingerprint, { ...result, alternateProvenance: [] });
      continue;
    }

    existing.alternateProvenance.push({
      resourceId: result.resourceId,
      chunkId: result.id,
      resourceTitle: result.resourceTitle,
    });
  }

  return Array.from(byFingerprint.values());
}

function rrfScore(rank: number, rrfK: number) {
  return 1 / (rrfK + rank);
}
