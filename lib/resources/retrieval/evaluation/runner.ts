import type {
  EvaluationSearchRepository,
  RetrievalEvaluationCase,
  RetrievalEvaluationCaseResult,
  RetrievalEvaluationReport,
  RetrievalEvaluationSplit,
} from "./types";

export async function runRetrievalEvaluation(input: {
  repository: EvaluationSearchRepository;
  cases: RetrievalEvaluationCase[];
  split?: RetrievalEvaluationSplit | "all";
  limit?: number;
  embeddingCoverage?: {
    eligibleChunkCount: number;
    completedChunkCount: number;
    failedChunkCount: number;
  };
}): Promise<RetrievalEvaluationReport> {
  const split = input.split ?? "all";
  const cases =
    split === "all"
      ? input.cases
      : input.cases.filter((item) => item.split === split);
  const results: RetrievalEvaluationCaseResult[] = [];

  for (const evaluationCase of cases) {
    const startedAt = performance.now();
    const chunks = await input.repository.hybridSearch({
      query: evaluationCase.query,
      filters: evaluationCase.filters,
      limit: input.limit ?? 5,
    });
    const latencyMs = performance.now() - startedAt;
    results.push(evaluateCase(evaluationCase, chunks, latencyMs));
  }

  return buildReport({
    split,
    results,
    coverage: input.embeddingCoverage ?? {
      eligibleChunkCount: 0,
      completedChunkCount: 0,
      failedChunkCount: 0,
    },
  });
}

function evaluateCase(
  evaluationCase: RetrievalEvaluationCase,
  chunks: Array<{
    id: string;
    resourceId: string;
    subjectId: string | null;
    topicId: string | null;
  }>,
  latencyMs: number
): RetrievalEvaluationCaseResult {
  const returnedChunkIds = chunks.map((chunk) => chunk.id);
  const returnedResourceIds = chunks.map((chunk) => chunk.resourceId);
  const expectedChunkIds = new Set(evaluationCase.expectedChunkIds ?? []);
  const expectedResourceIds = new Set(evaluationCase.expectedResourceIds ?? []);
  const forbiddenResourceIds = new Set(evaluationCase.forbiddenResourceIds ?? []);
  const chunkHitRank = firstRank(returnedChunkIds, expectedChunkIds);
  const resourceHitRank = firstRank(returnedResourceIds, expectedResourceIds);
  const filterAccurate = chunks.every((chunk) => {
    if (
      evaluationCase.filters?.subjectId &&
      chunk.subjectId !== evaluationCase.filters.subjectId
    ) {
      return false;
    }
    if (
      evaluationCase.filters?.topicId &&
      chunk.topicId !== evaluationCase.filters.topicId
    ) {
      return false;
    }
    return true;
  });

  return {
    caseId: evaluationCase.id,
    split: evaluationCase.split,
    query: evaluationCase.query,
    latencyMs,
    returnedChunkIds,
    returnedResourceIds,
    expectedChunkCount: expectedChunkIds.size,
    expectedResourceCount: expectedResourceIds.size,
    chunkHitRank,
    resourceHitRank,
    forbiddenReturned: returnedResourceIds.some((id) =>
      forbiddenResourceIds.has(id)
    ),
    filterAccurate,
    noEvidenceCorrect: evaluationCase.expectNoEvidence
      ? chunks.length === 0
      : null,
  };
}

function buildReport(input: {
  split: RetrievalEvaluationSplit | "all";
  results: RetrievalEvaluationCaseResult[];
  coverage: {
    eligibleChunkCount: number;
    completedChunkCount: number;
    failedChunkCount: number;
  };
}): RetrievalEvaluationReport {
  const { results } = input;
  const expectedChunkCases = results.filter(
    (result) => result.expectedChunkCount > 0
  );
  const expectedResourceCases = results.filter(
    (result) => result.expectedResourceCount > 0
  );
  const noEvidenceCases = results.filter((result) => result.noEvidenceCorrect !== null);
  const coverageRatio =
    input.coverage.eligibleChunkCount === 0
      ? 0
      : input.coverage.completedChunkCount / input.coverage.eligibleChunkCount;

  return {
    split: input.split,
    caseCount: results.length,
    chunkRecallAt1: recallAt(expectedChunkCases, 1, "chunkHitRank"),
    chunkRecallAt3: recallAt(expectedChunkCases, 3, "chunkHitRank"),
    chunkRecallAt5: recallAt(expectedChunkCases, 5, "chunkHitRank"),
    resourceRecallAt1: recallAt(expectedResourceCases, 1, "resourceHitRank"),
    resourceRecallAt3: recallAt(expectedResourceCases, 3, "resourceHitRank"),
    resourceRecallAt5: recallAt(expectedResourceCases, 5, "resourceHitRank"),
    mrr: meanReciprocalRank(results),
    forbiddenResultRate:
      results.length === 0
        ? 0
        : results.filter((result) => result.forbiddenReturned).length /
          results.length,
    filterAccuracy:
      results.length === 0
        ? 1
        : results.filter((result) => result.filterAccurate).length /
          results.length,
    correctNoEvidenceRate:
      noEvidenceCases.length === 0
        ? null
        : noEvidenceCases.filter((result) => result.noEvidenceCorrect).length /
          noEvidenceCases.length,
    latency: percentileSummary(results.map((result) => result.latencyMs)),
    embeddingCoverage: {
      ...input.coverage,
      ratio: coverageRatio,
    },
    results,
  };
}

function firstRank(ids: string[], expectedIds: Set<string>) {
  if (expectedIds.size === 0) return null;
  const index = ids.findIndex((id) => expectedIds.has(id));
  return index >= 0 ? index + 1 : null;
}

function recallAt(
  results: RetrievalEvaluationCaseResult[],
  k: number,
  field: "chunkHitRank" | "resourceHitRank"
) {
  if (results.length === 0) return 0;
  return results.filter((result) => {
    const rank = result[field];
    return rank !== null && rank <= k;
  }).length / results.length;
}

function meanReciprocalRank(results: RetrievalEvaluationCaseResult[]) {
  const ranks = results.flatMap((result) => {
    const rank = result.chunkHitRank ?? result.resourceHitRank;
    return rank ? [1 / rank] : [];
  });
  if (ranks.length === 0) return 0;
  return ranks.reduce((sum, value) => sum + value, 0) / ranks.length;
}

function percentileSummary(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
  };
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * p) - 1)
  );
  return sorted[index];
}
