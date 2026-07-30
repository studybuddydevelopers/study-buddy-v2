import type { RetrievalFilters, RetrievedChunk } from "../types";

export type RetrievalEvaluationSplit = "development" | "holdout";

export interface RetrievalEvaluationCase {
  id: string;
  split: RetrievalEvaluationSplit;
  query: string;
  expectedChunkIds?: string[];
  expectedResourceIds?: string[];
  forbiddenResourceIds?: string[];
  filters?: RetrievalFilters;
  expectNoEvidence?: boolean;
  notes?: string;
}

export interface RetrievalEvaluationCaseResult {
  caseId: string;
  split: RetrievalEvaluationSplit;
  query: string;
  latencyMs: number;
  returnedChunkIds: string[];
  returnedResourceIds: string[];
  expectedChunkCount: number;
  expectedResourceCount: number;
  chunkHitRank: number | null;
  resourceHitRank: number | null;
  forbiddenReturned: boolean;
  filterAccurate: boolean;
  noEvidenceCorrect: boolean | null;
}

export interface RetrievalEvaluationReport {
  split: RetrievalEvaluationSplit | "all";
  caseCount: number;
  chunkRecallAt1: number;
  chunkRecallAt3: number;
  chunkRecallAt5: number;
  resourceRecallAt1: number;
  resourceRecallAt3: number;
  resourceRecallAt5: number;
  mrr: number;
  forbiddenResultRate: number;
  filterAccuracy: number;
  correctNoEvidenceRate: number | null;
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  embeddingCoverage: {
    eligibleChunkCount: number;
    completedChunkCount: number;
    failedChunkCount: number;
    ratio: number;
  };
  results: RetrievalEvaluationCaseResult[];
}

export interface EvaluationSearchRepository {
  hybridSearch(input: {
    query: string;
    filters?: RetrievalFilters;
    limit?: number;
  }): Promise<RetrievedChunk[]>;
}
