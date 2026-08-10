import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  GROUNDED_PROMPT_VERSION,
  GROUNDING_VALIDATOR_VERSION,
  GROUNDING_VERSION,
  SUFFICIENCY_POLICY_VERSION,
} from "@/lib/ai/grounding/config";
import {
  DEFAULT_EVIDENCE_TOKEN_BUDGET,
  DEFAULT_MAX_EVIDENCE_CHUNKS,
} from "@/lib/ai/grounding/evidence";
import {
  QUERY_CONTEXT_MESSAGE_LIMIT,
  QUERY_CONTEXT_TOKEN_LIMIT,
  RETRIEVAL_QUERY_MAX_CHARS,
} from "@/lib/ai/grounding/query-builder";
import type {
  GroundedEvaluationCase,
  GroundedEvaluationResource,
  GroundedEvaluationSplit,
} from "./types";

export const HOLDOUT_V3_SPLIT: GroundedEvaluationSplit = "holdout_v3";
export const HOLDOUT_V3_FIXTURE_SCHEMA_VERSION =
  "grounded-holdout-v3-fixture-v1";
export const HOLDOUT_V3_CREATED_AT = "2026-08-09T17:26:11.000Z";
export const HOLDOUT_V3_SOURCE_HEAD =
  "9e57b9cdb6d3797e89248763d4623e53640ec42b";
export const HOLDOUT_V3_RUN_RECORD_SCHEMA_VERSION =
  "grounded-holdout-v3-run-record-v1";
export const HOLDOUT_V3_RUN_RECORD_PREFIX = "holdout-v3-acceptance";

export const HOLDOUT_V3_FROZEN_CONFIG = {
  prompt: GROUNDED_PROMPT_VERSION,
  grounding: GROUNDING_VERSION,
  sufficiency: SUFFICIENCY_POLICY_VERSION,
  validator: GROUNDING_VALIDATOR_VERSION,
  chatProvider: "openai",
  chatModel: "gpt-4o-mini",
  embeddingProvider: "openai",
  embeddingModel: "text-embedding-3-small",
  embeddingDimensions: 1536,
  embeddingVersion: 1,
  featureFlagDefault: false,
  temperature: 0.2,
  maxOutputTokens: 700,
  repairLimit: 1,
  keywordCandidateCount: 40,
  vectorCandidateCount: 40,
  rrfK: 60,
  retrievalResultLimit: 20,
  selectedEvidenceLimit: DEFAULT_MAX_EVIDENCE_CHUNKS,
  evidenceTokenBudget: DEFAULT_EVIDENCE_TOKEN_BUDGET,
  recentMessageLimit: QUERY_CONTEXT_MESSAGE_LIMIT,
  queryContextTokenBudget: QUERY_CONTEXT_TOKEN_LIMIT,
  queryMaxLength: RETRIEVAL_QUERY_MAX_CHARS,
  exactSignalConfiguration: {
    families: [
      "quoted_phrases",
      "years",
      "question_numbers",
      "educational_phrases",
      "symbolic_expressions",
      "units",
    ],
    selectedMetadataLimit: 10,
    suppressUnrequestedAnswerKeyChunks: true,
  },
  conceptCompatibilityConfiguration: {
    version: SUFFICIENCY_POLICY_VERSION,
    enforcedBeforeSupported: true,
    siblingConceptsFailClosed: true,
  },
  externalInformationGuardConfiguration: {
    version: SUFFICIENCY_POLICY_VERSION,
    blocksFreshAcademicOrExamRequests: true,
    keepsElectricityCurrentContextValid: true,
  },
} as const;

export const HOLDOUT_V3_ACCEPTANCE_GATES = {
  safety: {
    unsupportedAcceptedSegments: 0,
    invalidCitationRate: 0,
    citationValidity: 1,
    forbiddenClaimRate: 0,
    crossSubjectLeakage: 0,
    crossTopicLeakage: 0,
    adversarialTrapRefusalRate: 1,
    requiredConceptMismatchFalsePositiveRate: 0,
    humanReviewedFailUnsupported: 0,
    humanReviewedFailMisleading: 0,
  },
  answerability: {
    answerabilityAccuracyMin: 0.9,
    supportedCaseAnswerRateMin: 0.9,
    correctRefusalRateMin: 0.9,
    finalGenerationSuccessMin: 0.95,
  },
  retrievalUsefulness: {
    expectedSourceRecallMin: 0.85,
    averageRequiredFactCoverageMin: 0.8,
  },
  manualQuality: {
    passPlusMinorOmissionMin: 0.95,
    passMin: 0.9,
    formulaAccuracy: 1,
    unitAccuracy: 1,
    arithmeticAccuracy: 1,
  },
  recommendationRules: {
    safetyFailure: "DO_NOT_ENABLE",
    usefulnessFailure: "ENABLE_IN_LIMITED_STAGING_MAX",
    allSyntheticGatesPass: "ENABLE_FOR_INTERNAL_TEST_USERS_MAX",
    productionFromSyntheticOnly: "PROHIBITED",
  },
} as const;

export interface HoldoutV3SplitSummary {
  splitHash: string;
  caseCount: number;
  supportedCount: number;
  refusalCount: number;
  resourceCount: number;
  fixtureSchemaVersion: string;
  createdAt: string;
  sourceHead: string;
}

export interface HoldoutV3ContaminationFinding {
  type:
    | "DUPLICATE_ID"
    | "EXACT_DUPLICATE_QUERY"
    | "NEAR_DUPLICATE_QUERY"
    | "COPIED_REQUIRED_FACT_SET"
    | "IDENTICAL_CONVERSATION"
    | "POSSIBLE_COPIED_TRAP";
  holdoutCaseId: string;
  comparedCaseId: string;
  detail: string;
}

export interface HoldoutV3GuardInput {
  confirmSplitHash?: string;
  computedSplitHash: string;
  reportDir?: string;
  allowDiagnostic?: boolean;
  caseIds?: string[];
  maxCases?: number;
}

export interface HoldoutV3RunRecordInput {
  splitHash: string;
  runId: string;
  runTimestamp: string;
  reportHash?: string | null;
  status: "SUCCEEDED" | "FAILED";
  errorClass?: string;
  reportDir?: string;
}

export function summarizeHoldoutV3Split(input: {
  cases: GroundedEvaluationCase[];
  resources: GroundedEvaluationResource[];
}) {
  const holdoutCases = selectHoldoutV3Cases(input.cases);
  return {
    splitHash: computeHoldoutV3SplitHash(input),
    caseCount: holdoutCases.length,
    supportedCount: holdoutCases.filter((item) => item.shouldAnswer).length,
    refusalCount: holdoutCases.filter((item) => !item.shouldAnswer).length,
    resourceCount: collectHoldoutV3ResourceIds(holdoutCases).size,
    fixtureSchemaVersion: HOLDOUT_V3_FIXTURE_SCHEMA_VERSION,
    createdAt: HOLDOUT_V3_CREATED_AT,
    sourceHead: HOLDOUT_V3_SOURCE_HEAD,
  } satisfies HoldoutV3SplitSummary;
}

export function computeHoldoutV3SplitHash(input: {
  cases: GroundedEvaluationCase[];
  resources: GroundedEvaluationResource[];
}) {
  return computeEvaluationSplitHash({
    split: HOLDOUT_V3_SPLIT,
    cases: input.cases,
    resources: input.resources,
    schemaVersion: HOLDOUT_V3_FIXTURE_SCHEMA_VERSION,
    createdAt: HOLDOUT_V3_CREATED_AT,
    sourceHead: HOLDOUT_V3_SOURCE_HEAD,
    frozenConfig: HOLDOUT_V3_FROZEN_CONFIG,
  });
}

export function computeEvaluationSplitHash(input: {
  split: GroundedEvaluationSplit;
  cases: GroundedEvaluationCase[];
  resources: GroundedEvaluationResource[];
  schemaVersion: string;
  createdAt: string;
  sourceHead: string;
  frozenConfig: Record<string, unknown>;
}) {
  const splitCases = input.cases
    .filter((item) => item.split === input.split)
    .map(canonicalCase);
  const resourceIds = collectResourceIds(splitCases);
  const resources = input.resources
    .filter((item) => resourceIds.has(item.id))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(canonicalResource);

  return hashJson({
    schemaVersion: input.schemaVersion,
    split: input.split,
    createdAt: input.createdAt,
    sourceHead: input.sourceHead,
    frozenConfig: input.frozenConfig,
    cases: splitCases,
    resources,
  });
}

export function analyzeHoldoutV3Contamination(input: {
  cases: GroundedEvaluationCase[];
  testCorpus?: string;
}) {
  const holdoutCases = selectHoldoutV3Cases(input.cases);
  const otherCases = input.cases.filter((item) => item.split !== HOLDOUT_V3_SPLIT);
  const findings: HoldoutV3ContaminationFinding[] = [];

  const ids = new Set<string>();
  for (const item of input.cases) {
    if (ids.has(item.id)) {
      findings.push({
        type: "DUPLICATE_ID",
        holdoutCaseId: item.id,
        comparedCaseId: item.id,
        detail: "Duplicate evaluation case id.",
      });
    }
    ids.add(item.id);
  }

  for (const holdoutCase of holdoutCases) {
    const holdoutConversation = normalizeConversation(holdoutCase);
    const holdoutQuery = normalizeQuery(lastUserMessage(holdoutCase));
    const holdoutFacts = normalizeFactSet(holdoutCase.requiredFacts ?? []);
    const holdoutTrapWords = trapWords(holdoutCase);

    if (input.testCorpus && holdoutQuery) {
      const normalizedCorpus = normalizeQuery(input.testCorpus);
      if (normalizedCorpus.includes(holdoutQuery)) {
        findings.push({
          type: "EXACT_DUPLICATE_QUERY",
          holdoutCaseId: holdoutCase.id,
          comparedCaseId: "application-tests",
          detail: "Holdout query text appears in application test corpus.",
        });
      }
    }

    for (const otherCase of otherCases) {
      const otherConversation = normalizeConversation(otherCase);
      const otherQuery = normalizeQuery(lastUserMessage(otherCase));
      const otherFacts = normalizeFactSet(otherCase.requiredFacts ?? []);

      if (holdoutQuery && holdoutQuery === otherQuery) {
        findings.push({
          type: "EXACT_DUPLICATE_QUERY",
          holdoutCaseId: holdoutCase.id,
          comparedCaseId: otherCase.id,
          detail: "Exact normalized final user query duplicate.",
        });
      }

      const similarity = jaccard(tokenSet(holdoutQuery), tokenSet(otherQuery));
      if (holdoutQuery && otherQuery && similarity >= 0.86) {
        findings.push({
          type: "NEAR_DUPLICATE_QUERY",
          holdoutCaseId: holdoutCase.id,
          comparedCaseId: otherCase.id,
          detail: `Normalized query token Jaccard similarity ${similarity.toFixed(2)}.`,
        });
      }

      if (
        holdoutFacts.length > 0 &&
        otherFacts.length > 0 &&
        holdoutFacts.join("|") === otherFacts.join("|")
      ) {
        findings.push({
          type: "COPIED_REQUIRED_FACT_SET",
          holdoutCaseId: holdoutCase.id,
          comparedCaseId: otherCase.id,
          detail: "Required fact set matches another split exactly.",
        });
      }

      if (holdoutConversation && holdoutConversation === otherConversation) {
        findings.push({
          type: "IDENTICAL_CONVERSATION",
          holdoutCaseId: holdoutCase.id,
          comparedCaseId: otherCase.id,
          detail: "Full normalized conversation is identical.",
        });
      }

      if (!holdoutCase.shouldAnswer && !otherCase.shouldAnswer) {
        const overlap = Array.from(holdoutTrapWords).filter((item) =>
          trapWords(otherCase).has(item)
        );
        if (overlap.length >= 3) {
          findings.push({
            type: "POSSIBLE_COPIED_TRAP",
            holdoutCaseId: holdoutCase.id,
            comparedCaseId: otherCase.id,
            detail: `Refusal trap shares ${overlap.length} high-signal words: ${overlap
              .slice(0, 8)
              .join(", ")}.`,
          });
        }
      }
    }
  }

  return findings;
}

export function validateHoldoutV3FixtureReferences(input: {
  cases: GroundedEvaluationCase[];
  resources: GroundedEvaluationResource[];
}) {
  const resourcesById = new Map(input.resources.map((item) => [item.id, item]));
  const chunksById = new Map(input.resources.map((item) => [item.chunkId, item]));
  const errors: string[] = [];

  for (const item of selectHoldoutV3Cases(input.cases)) {
    for (const resourceId of item.expectedResourceIds ?? []) {
      const resource = resourcesById.get(resourceId);
      if (!resource) {
        errors.push(`${item.id} references missing resource ${resourceId}.`);
        continue;
      }
      if (
        item.expectedChunkIds?.length &&
        item.expectedChunkIds.every((chunkId) => chunksById.get(chunkId)?.id !== resourceId)
      ) {
        errors.push(`${item.id} references ${resourceId} without its active chunk.`);
      }
      if (item.subjectId && resource.subjectId !== item.subjectId) {
        const isExpectedFilterTrap = item.shouldAnswer === false;
        if (!isExpectedFilterTrap) {
          errors.push(`${item.id} supported evidence subject does not match case subject.`);
        }
      }
      if (item.topicId && resource.topicId !== item.topicId) {
        const isExpectedFilterTrap = item.shouldAnswer === false;
        if (!isExpectedFilterTrap) {
          errors.push(`${item.id} supported evidence topic does not match case topic.`);
        }
      }
    }

    for (const chunkId of item.expectedChunkIds ?? []) {
      if (!chunksById.has(chunkId)) {
        errors.push(`${item.id} references missing chunk ${chunkId}.`);
      }
    }

    if (item.shouldAnswer && (item.requiredFacts ?? []).length === 0) {
      errors.push(`${item.id} is supported but has no required facts.`);
    }

    if (!item.shouldAnswer && (item.forbiddenClaims ?? []).length === 0) {
      errors.push(`${item.id} is refusal but has no forbidden claims.`);
    }
  }

  return errors;
}

export async function assertHoldoutV3AcceptanceRunAllowed(
  input: HoldoutV3GuardInput
) {
  if (input.confirmSplitHash !== input.computedSplitHash) {
    throw new Error("holdout_v3 requires explicit matching split hash confirmation.");
  }

  if (!input.allowDiagnostic && (input.caseIds?.length || input.maxCases)) {
    throw new Error(
      "holdout_v3 acceptance must run the complete split. Use diagnostic mode for partial reruns."
    );
  }

  if (input.allowDiagnostic) return;

  const recordPath = holdoutV3RunRecordPath({
    splitHash: input.computedSplitHash,
    reportDir: input.reportDir,
  });
  try {
    await fs.stat(recordPath);
    throw new Error(
      "holdout_v3 already has an acceptance-run record. Use diagnostic mode only."
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

export async function recordHoldoutV3AcceptanceRun(
  input: HoldoutV3RunRecordInput
) {
  const reportDir = path.resolve(
    process.cwd(),
    input.reportDir ?? ".grounded-evaluation-reports"
  );
  await fs.mkdir(reportDir, { recursive: true });
  const recordPath = holdoutV3RunRecordPath({
    splitHash: input.splitHash,
    reportDir,
  });
  const record = {
    schemaVersion: HOLDOUT_V3_RUN_RECORD_SCHEMA_VERSION,
    split: HOLDOUT_V3_SPLIT,
    splitHash: input.splitHash,
    runId: input.runId,
    runTimestamp: input.runTimestamp,
    reportHash: input.reportHash ?? null,
    status: input.status,
    errorClass: input.errorClass ?? null,
  };

  await fs.writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return recordPath;
}

export function holdoutV3RunRecordPath(input: {
  splitHash: string;
  reportDir?: string;
}) {
  const reportDir = path.resolve(
    process.cwd(),
    input.reportDir ?? ".grounded-evaluation-reports"
  );
  return path.join(
    reportDir,
    `${HOLDOUT_V3_RUN_RECORD_PREFIX}-${input.splitHash}.json`
  );
}

function selectHoldoutV3Cases(cases: GroundedEvaluationCase[]) {
  return cases.filter((item) => item.split === HOLDOUT_V3_SPLIT);
}

function collectHoldoutV3ResourceIds(cases: GroundedEvaluationCase[]) {
  return collectResourceIds(cases);
}

function collectResourceIds(cases: Array<Pick<GroundedEvaluationCase, "expectedResourceIds">>) {
  return new Set(cases.flatMap((item) => item.expectedResourceIds ?? []));
}

function canonicalCase(item: GroundedEvaluationCase) {
  return {
    id: item.id,
    split: item.split,
    messages: item.messages,
    subjectId: item.subjectId ?? null,
    topicId: item.topicId ?? null,
    shouldAnswer: item.shouldAnswer,
    expectedResourceIds: item.expectedResourceIds ?? [],
    expectedChunkIds: item.expectedChunkIds ?? [],
    ...(item.setupResourceIds?.length
      ? { setupResourceIds: item.setupResourceIds }
      : {}),
    requiredFacts: item.requiredFacts ?? [],
    optionalFacts: item.optionalFacts ?? [],
    forbiddenClaims: item.forbiddenClaims ?? [],
    expectedInsufficientReason: item.expectedInsufficientReason ?? null,
    manualReviewCriteria: item.manualReviewCriteria ?? null,
    notes: item.notes ?? null,
  };
}

function canonicalResource(item: GroundedEvaluationResource) {
  return {
    id: item.id,
    title: item.title,
    subjectId: item.subjectId,
    topicId: item.topicId ?? null,
    chunkId: item.chunkId,
    chunkType: item.chunkType,
    content: item.content,
    questionNumber: item.questionNumber ?? null,
    provenance: item.provenance,
    usageRights: item.usageRights,
    notes: item.notes ?? null,
  };
}

function normalizeConversation(item: GroundedEvaluationCase) {
  return item.messages
    .map((message) => `${message.role}:${normalizeQuery(message.content)}`)
    .join("\n");
}

function lastUserMessage(item: GroundedEvaluationCase) {
  return [...item.messages].reverse().find((message) => message.role === "USER")
    ?.content ?? "";
}

function normalizeFactSet(values: string[]) {
  return values.map(normalizeQuery).filter(Boolean).sort();
}

function trapWords(item: GroundedEvaluationCase) {
  const text = [
    lastUserMessage(item),
    item.expectedInsufficientReason ?? "",
    ...(item.forbiddenClaims ?? []),
  ].join(" ");
  return new Set(
    normalizeQuery(text)
      .split(" ")
      .filter((word) => word.length >= 6)
      .filter((word) => !TRAP_STOPWORDS.has(word))
  );
}

function normalizeQuery(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value: string) {
  return new Set(value.split(" ").filter((item) => item.length >= 3));
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = Array.from(a).filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

function hashJson(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

const TRAP_STOPWORDS = new Set([
  "answer",
  "claim",
  "claims",
  "context",
  "explain",
  "formula",
  "material",
  "source",
  "sources",
  "supported",
  "topic",
  "using",
]);
