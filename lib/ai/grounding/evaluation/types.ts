export type GroundedEvaluationSplit = "development" | "holdout";

export interface GroundedEvaluationResource {
  id: string;
  title: string;
  subjectId: string;
  topicId?: string;
  chunkId: string;
  chunkType:
    | "CONTENT_SECTION"
    | "PAST_QUESTION"
    | "MARK_SCHEME"
    | "WORKED_SOLUTION"
    | "SYLLABUS_OBJECTIVE"
    | "FORMULA_REFERENCE";
  content: string;
  questionNumber?: string;
  provenance: string;
  usageRights: string;
  notes?: string;
}

export interface GroundedEvaluationCase {
  id: string;
  split: GroundedEvaluationSplit;
  messages: Array<{ role: "USER" | "ASSISTANT"; content: string }>;
  subjectId?: string;
  topicId?: string;
  shouldAnswer: boolean;
  expectedResourceIds?: string[];
  expectedChunkIds?: string[];
  requiredFacts?: string[];
  forbiddenClaims?: string[];
  expectedInsufficientReason?: string;
  notes?: string;
}

export interface GroundedEvaluationCitation {
  sourceLabel: string;
  resourceId?: string;
  chunkId?: string;
  subjectId?: string;
  topicId?: string;
}

export interface GroundedEvaluationCaseResult {
  caseId: string;
  split: GroundedEvaluationSplit;
  shouldAnswer: boolean;
  didAnswer: boolean;
  validCitations: boolean;
  invalidCitationCount: number;
  unsupportedAnswer: boolean;
  expectedSourceHit: boolean | null;
  forbiddenClaimHit: boolean;
  citationPrecision: number | null;
  requiredFactCoverage: number | null;
  crossSubjectLeakage: boolean;
  crossTopicLeakage: boolean;
  structuredOutputFailed: boolean;
  repairAttempted: boolean;
  retrievalLatencyMs: number | null;
  generationLatencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
}

export interface GroundedEvaluationReport {
  split: GroundedEvaluationSplit | "all";
  caseCount: number;
  answerabilityAccuracy: number;
  correctRefusalRate: number | null;
  unsupportedFactualAnswerRate: number;
  invalidCitationRate: number;
  citationValidity: number;
  citationPrecision: number | null;
  expectedSourceRecall: number | null;
  requiredFactCoverage: number | null;
  forbiddenClaimRate: number;
  crossSubjectLeakageRate: number;
  crossTopicLeakageRate: number;
  structuredOutputFailureRate: number;
  repairAttemptRate: number;
  retrievalLatencyMs: { p50: number; p95: number; p99: number } | null;
  generationLatencyMs: { p50: number; p95: number; p99: number } | null;
  tokenUsage: { inputTokens: number; outputTokens: number };
  estimatedCostUsd: number | null;
  results: GroundedEvaluationCaseResult[];
}
