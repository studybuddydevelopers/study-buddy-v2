export type GroundedEvaluationSplit =
  | "development"
  | "regression"
  | "holdout"
  | "holdout_v2"
  | "manual_quality"
  | "holdout_v3"
  | "holdout_v4"
  | "adversarial_safety";

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
  corpusResourceIds?: string[];
  expectedResourceIds?: string[];
  expectedChunkIds?: string[];
  setupResourceIds?: string[];
  requiredFacts?: string[];
  optionalFacts?: string[];
  forbiddenClaims?: string[];
  expectedInsufficientReason?: string;
  manualReviewCriteria?: {
    formulaAccuracy?: boolean;
    unitAccuracy?: boolean;
    arithmeticAccuracy?: boolean;
    caveats?: string[];
  };
  notes?: string;
}

export interface GroundedEvaluationCitation {
  sourceLabel: string;
  resourceId?: string;
  chunkId?: string;
  subjectId?: string;
  topicId?: string;
}

export interface GroundedEvaluationAnswerSegment {
  index: number;
  text: string;
  sourceLabels: string[];
}

export interface GroundedEvaluationGroundingValidationResult {
  index: number;
  text: string;
  sourceLabels: string[];
  supported: boolean;
  reason: string;
  unsupportedTerms: string[];
  unsupportedClaim?: string;
  validatorVersion: string;
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
  unsupportedSegmentFailed: boolean;
  regenerationUsed: boolean;
  successfulRepair: boolean;
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
  unsupportedSegmentFailureRate: number;
  groundingValidationFailureRate: number;
  regenerationRate: number;
  successfulRepairRate: number | null;
  supportedQuestionAnsweredRate: number | null;
  supportedQuestionFalseRefusalRate: number | null;
  retrievalLatencyMs: { p50: number; p95: number; p99: number } | null;
  generationLatencyMs: { p50: number; p95: number; p99: number } | null;
  tokenUsage: { inputTokens: number; outputTokens: number };
  estimatedCostUsd: number | null;
  results: GroundedEvaluationCaseResult[];
}

export type GroundedEvaluationClassification =
  | "SUPPORTED"
  | "INSUFFICIENT_CONTEXT"
  | "FAILED";

export interface GroundedEvaluationReviewCitation {
  sourceLabel: string;
  resourceId?: string;
  chunkId?: string;
  subjectId?: string;
  topicId?: string;
  excerpt: string;
  excerptTruncated: boolean;
}

export interface GroundedEvaluationReviewCase {
  caseId: string;
  userQuery: string;
  expectedClassification: GroundedEvaluationClassification;
  actualClassification: GroundedEvaluationClassification;
  generatedAnswerText: string;
  generatedAnswerTruncated: boolean;
  answerContentHash: string;
  citationMarkers: string[];
  sourceLabels: string[];
  citations: GroundedEvaluationCitation[];
  citedExcerpts: GroundedEvaluationReviewCitation[];
  answerSegments: GroundedEvaluationAnswerSegment[];
  groundingValidatorResults: GroundedEvaluationGroundingValidationResult[];
  regenerationUsed: boolean;
  originalUnsupportedSegmentIndices: number[];
  finalAcceptedSegments: GroundedEvaluationAnswerSegment[];
  groundingValidatorVersion: string | null;
  requiredFacts: string[];
  detectedRequiredFacts: string[];
  forbiddenClaims: string[];
  detectedForbiddenClaims: string[];
  insufficiencyReason: string | null;
  versions: {
    prompt: string;
    grounding: string;
    sufficiency: string;
  };
  provider: string | null;
  model: string | null;
  repairUsed: boolean;
  tokenUsage: {
    inputTokens: number | null;
    outputTokens: number | null;
  };
}

export interface GroundedEvaluationReportSourceState {
  commit: string | null;
  diffHash: string;
  dirty: boolean;
}

export interface GroundedEvaluationReviewReport {
  reportSchemaVersion: string;
  runId: string;
  runTimestamp: string;
  fixtureHash: string;
  splitHash?: string | null;
  sourceState: GroundedEvaluationReportSourceState;
  frozenConfig: Record<string, unknown>;
  caseCount: number;
  cases: GroundedEvaluationReviewCase[];
  reportHash: string;
}
