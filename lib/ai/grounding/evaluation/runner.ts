import type {
  GroundedEvaluationAnswerSegment,
  GroundedEvaluationCitation,
  GroundedEvaluationCase,
  GroundedEvaluationCaseResult,
  GroundedEvaluationGroundingValidationResult,
  GroundedEvaluationReport,
  GroundedEvaluationSplit,
} from "./types";
import {
  evaluationPhraseAppears,
  findPresentEvaluationFacts,
} from "./fact-matching";

export interface GroundedEvaluationAnswer {
  answer: string;
  insufficientContext: boolean;
  citations: GroundedEvaluationCitation[];
  structuredOutputFailed?: boolean;
  repairAttempted?: boolean;
  unsupportedSegmentFailed?: boolean;
  regenerationUsed?: boolean;
  successfulRepair?: boolean;
  answerSegments?: GroundedEvaluationAnswerSegment[];
  groundingValidatorResults?: GroundedEvaluationGroundingValidationResult[];
  retrievalLatencyMs?: number;
  generationLatencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
}

export async function runGroundedEvaluation(input: {
  cases: GroundedEvaluationCase[];
  split?: GroundedEvaluationSplit | "all";
  answerCase: (item: GroundedEvaluationCase) => Promise<GroundedEvaluationAnswer>;
}): Promise<GroundedEvaluationReport> {
  const split = input.split ?? "all";
  const cases =
    split === "all"
      ? input.cases
      : input.cases.filter((item) => item.split === split);
  const results: GroundedEvaluationCaseResult[] = [];

  for (const evaluationCase of cases) {
    const answer = await input.answerCase(evaluationCase);
    results.push(evaluateGroundedCase(evaluationCase, answer));
  }

  return buildGroundedReport(split, results);
}

export function evaluateGroundedCase(
  evaluationCase: GroundedEvaluationCase,
  answer: GroundedEvaluationAnswer
): GroundedEvaluationCaseResult {
  const didAnswer =
    !answer.insufficientContext &&
    answer.structuredOutputFailed !== true &&
    answer.answer.trim().length > 0;
  const expectedResourceIds = new Set(evaluationCase.expectedResourceIds ?? []);
  const expectedChunkIds = new Set(evaluationCase.expectedChunkIds ?? []);
  const invalidCitationCount = answer.citations.filter(
    (citation) => !/^SOURCE_[1-9][0-9]*$/.test(citation.sourceLabel)
  ).length;
  const expectedSourceHit =
    expectedResourceIds.size === 0 && expectedChunkIds.size === 0
      ? null
      : answer.citations.some(
          (citation) =>
            (citation.resourceId && expectedResourceIds.has(citation.resourceId)) ||
            (citation.chunkId && expectedChunkIds.has(citation.chunkId))
        );
  const forbiddenClaimHit = (evaluationCase.forbiddenClaims ?? []).some((claim) =>
    containsForbiddenClaim(answer.answer, claim)
  );
  const unsupportedAnswer = !evaluationCase.shouldAnswer && didAnswer;
  const expectedCitationCount = answer.citations.filter(
    (citation) =>
      (citation.resourceId && expectedResourceIds.has(citation.resourceId)) ||
      (citation.chunkId && expectedChunkIds.has(citation.chunkId))
  ).length;
  const citationPrecision =
    answer.citations.length === 0
      ? expectedResourceIds.size === 0 && expectedChunkIds.size === 0
        ? null
        : 0
      : expectedResourceIds.size === 0 && expectedChunkIds.size === 0
        ? null
        : expectedCitationCount / answer.citations.length;
  const requiredFacts = evaluationCase.requiredFacts ?? [];
  const requiredFactCoverage =
    requiredFacts.length === 0
      ? null
      : findPresentEvaluationFacts(answer.answer, requiredFacts).length /
        requiredFacts.length;
  const crossSubjectLeakage =
    Boolean(evaluationCase.subjectId) &&
    answer.citations.some(
      (citation) =>
        citation.subjectId !== undefined &&
        citation.subjectId !== evaluationCase.subjectId
    );
  const crossTopicLeakage =
    Boolean(evaluationCase.topicId) &&
    answer.citations.some(
      (citation) =>
        citation.topicId !== undefined && citation.topicId !== evaluationCase.topicId
    );

  return {
    caseId: evaluationCase.id,
    split: evaluationCase.split,
    shouldAnswer: evaluationCase.shouldAnswer,
    didAnswer,
    validCitations: invalidCitationCount === 0,
    invalidCitationCount,
    unsupportedAnswer,
    expectedSourceHit,
    forbiddenClaimHit,
    citationPrecision,
    requiredFactCoverage,
    crossSubjectLeakage,
    crossTopicLeakage,
    structuredOutputFailed: answer.structuredOutputFailed === true,
    repairAttempted: answer.repairAttempted === true,
    unsupportedSegmentFailed: answer.unsupportedSegmentFailed === true,
    regenerationUsed: answer.regenerationUsed === true,
    successfulRepair: answer.successfulRepair === true,
    retrievalLatencyMs: validNonNegative(answer.retrievalLatencyMs),
    generationLatencyMs: validNonNegative(answer.generationLatencyMs),
    inputTokens: validNonNegative(answer.inputTokens),
    outputTokens: validNonNegative(answer.outputTokens),
    estimatedCostUsd: validNonNegative(answer.estimatedCostUsd),
  };
}

function buildGroundedReport(
  split: GroundedEvaluationSplit | "all",
  results: GroundedEvaluationCaseResult[]
): GroundedEvaluationReport {
  const refusalCases = results.filter((result) => !result.shouldAnswer);
  const expectedSourceCases = results.filter(
    (result) => result.expectedSourceHit !== null
  );
  const citationPrecisionValues = results
    .map((result) => result.citationPrecision)
    .filter((value): value is number => value !== null);
  const requiredFactValues = results
    .map((result) => result.requiredFactCoverage)
    .filter((value): value is number => value !== null);
  const retrievalLatencies = results
    .map((result) => result.retrievalLatencyMs)
    .filter((value): value is number => value !== null);
  const generationLatencies = results
    .map((result) => result.generationLatencyMs)
    .filter((value): value is number => value !== null);
  const estimatedCosts = results
    .map((result) => result.estimatedCostUsd)
    .filter((value): value is number => value !== null);

  return {
    split,
    caseCount: results.length,
    answerabilityAccuracy: ratio(
      results.filter((result) => result.shouldAnswer === result.didAnswer).length,
      results.length
    ),
    correctRefusalRate:
      refusalCases.length === 0
        ? null
        : ratio(
            refusalCases.filter((result) => !result.didAnswer).length,
            refusalCases.length
          ),
    unsupportedFactualAnswerRate: ratio(
      results.filter((result) => result.unsupportedAnswer).length,
      results.length
    ),
    invalidCitationRate: ratio(
      results.filter((result) => result.invalidCitationCount > 0).length,
      results.length
    ),
    citationValidity: ratio(
      results.filter((result) => result.validCitations).length,
      results.length
    ),
    citationPrecision:
      citationPrecisionValues.length === 0
        ? null
        : average(citationPrecisionValues),
    expectedSourceRecall:
      expectedSourceCases.length === 0
        ? null
        : ratio(
            expectedSourceCases.filter((result) => result.expectedSourceHit).length,
            expectedSourceCases.length
          ),
    requiredFactCoverage:
      requiredFactValues.length === 0 ? null : average(requiredFactValues),
    forbiddenClaimRate: ratio(
      results.filter((result) => result.forbiddenClaimHit).length,
      results.length
    ),
    crossSubjectLeakageRate: ratio(
      results.filter((result) => result.crossSubjectLeakage).length,
      results.length
    ),
    crossTopicLeakageRate: ratio(
      results.filter((result) => result.crossTopicLeakage).length,
      results.length
    ),
    structuredOutputFailureRate: ratio(
      results.filter((result) => result.structuredOutputFailed).length,
      results.length
    ),
    repairAttemptRate: ratio(
      results.filter((result) => result.repairAttempted).length,
      results.length
    ),
    unsupportedSegmentFailureRate: ratio(
      results.filter((result) => result.unsupportedSegmentFailed).length,
      results.length
    ),
    groundingValidationFailureRate: ratio(
      results.filter((result) => result.unsupportedSegmentFailed).length,
      results.length
    ),
    regenerationRate: ratio(
      results.filter((result) => result.regenerationUsed).length,
      results.length
    ),
    successfulRepairRate:
      results.filter((result) => result.regenerationUsed).length === 0
        ? null
        : ratio(
            results.filter((result) => result.successfulRepair).length,
            results.filter((result) => result.regenerationUsed).length
          ),
    supportedQuestionAnsweredRate:
      results.filter((result) => result.shouldAnswer).length === 0
        ? null
        : ratio(
            results.filter((result) => result.shouldAnswer && result.didAnswer)
              .length,
            results.filter((result) => result.shouldAnswer).length
          ),
    supportedQuestionFalseRefusalRate:
      results.filter((result) => result.shouldAnswer).length === 0
        ? null
        : ratio(
            results.filter(
              (result) =>
                result.shouldAnswer &&
                !result.didAnswer &&
                !result.structuredOutputFailed
            ).length,
            results.filter((result) => result.shouldAnswer).length
          ),
    retrievalLatencyMs: percentileSummary(retrievalLatencies),
    generationLatencyMs: percentileSummary(generationLatencies),
    tokenUsage: {
      inputTokens: results.reduce((sum, result) => sum + (result.inputTokens ?? 0), 0),
      outputTokens: results.reduce((sum, result) => sum + (result.outputTokens ?? 0), 0),
    },
    estimatedCostUsd:
      estimatedCosts.length === 0
        ? null
        : estimatedCosts.reduce((sum, value) => sum + value, 0),
    results,
  };
}

function ratio(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentileSummary(values: number[]) {
  if (values.length === 0) return null;
  return {
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99),
  };
}

function percentile(values: number[], quantile: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * quantile) - 1)
  );
  return sorted[index] ?? 0;
}

function validNonNegative(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function containsForbiddenClaim(answer: string, claim: string) {
  return evaluationPhraseAppears(answer, claim);
}
