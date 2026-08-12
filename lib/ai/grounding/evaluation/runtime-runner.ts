import { createHash, randomUUID } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  AiGenerationFailureCode,
  ResourceApprovalStatus,
  ResourceExtractionQuality,
  ResourceProcessingStatus,
  ResourceSourceKind,
} from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { getChatModelProvider } from "@/lib/ai/chat/provider";
import type { ChatModelProvider } from "@/lib/ai/chat/types";
import { getConfiguredEmbeddingProvider } from "@/lib/ai/embeddings/provider";
import type { EmbeddingProvider } from "@/lib/ai/embeddings/types";
import { GroundedGenerationService } from "@/lib/ai/grounding/grounded-generation-service";
import {
  GROUNDING_VALIDATOR_VERSION,
  GROUNDED_PROMPT_VERSION,
  GROUNDING_VERSION,
  SUFFICIENCY_POLICY_VERSION,
  isGroundedChatEnabled,
} from "@/lib/ai/grounding/config";
import {
  buildStandaloneRetrievalQuery,
  QUERY_CONTEXT_MESSAGE_LIMIT,
  QUERY_CONTEXT_TOKEN_LIMIT,
  RETRIEVAL_QUERY_MAX_CHARS,
} from "@/lib/ai/grounding/query-builder";
import {
  DEFAULT_EVIDENCE_TOKEN_BUDGET,
  DEFAULT_MAX_EVIDENCE_CHUNKS,
  selectGroundingEvidence,
} from "@/lib/ai/grounding/evidence";
import { evaluateRetrievalSufficiency } from "@/lib/ai/grounding/sufficiency";
import { PostgresResourceSearchRepository } from "@/lib/resources/retrieval/postgres-resource-search-repository";
import {
  groundedEvaluationCases,
  groundedEvaluationResources,
} from "./fixtures";
import {
  HOLDOUT_V3_FROZEN_CONFIG,
  HOLDOUT_V3_SPLIT,
  assertHoldoutV3AcceptanceRunAllowed,
  computeHoldoutV3SplitHash,
  recordHoldoutV3AcceptanceRun,
  updateHoldoutV3AcceptanceRun,
} from "./holdout-v3";
import {
  HOLDOUT_V4_FROZEN_CONFIG,
  HOLDOUT_V4_SPLIT,
  assertHoldoutV4AcceptanceRunAllowed,
  computeHoldoutV4SplitHash,
  recordHoldoutV4AcceptanceRun,
  updateHoldoutV4AcceptanceRun,
} from "./holdout-v4";
import {
  assertEvaluationTopology,
  buildEvaluationTopologyReport,
  resolveEvaluationMetadataForCases,
  type EvaluationMetadataScope,
  type EvaluationTopologyReport,
} from "./metadata-scope";
import {
  assertEvaluationResourceScope,
  buildEvaluationResourceScope,
  corpusResourceIdsForCase,
  resolveEvaluationResourcesForSplit,
  type EvaluationResourceScope,
} from "./resource-scope";
import {
  runGroundedEvaluation,
  type GroundedEvaluationAnswer,
} from "./runner";
import {
  buildReviewCase,
  buildReviewReport,
} from "./review-report";
import type {
  GroundedEvaluationCase,
  GroundedEvaluationReport,
  GroundedEvaluationReportSourceState,
  GroundedEvaluationReviewCase,
  GroundedEvaluationReviewReport,
  GroundedEvaluationResource,
  GroundedEvaluationSplit,
} from "./types";

type PrismaClient = typeof defaultPrisma;
const execFile = promisify(execFileCallback);

export interface RuntimeGroundedEvaluationOptions {
  split: GroundedEvaluationSplit | "all";
  caseIds?: string[];
  provider?: ChatModelProvider;
  embeddingProvider?: EmbeddingProvider;
  prisma?: PrismaClient;
  allowConsumedHoldoutDiagnostic?: boolean;
  confirmHoldoutFixtureHash?: string;
  maxCases?: number;
  reportDir?: string;
}

export interface RuntimeGroundedEvaluationPreflightReport {
  dryRun: true;
  providerCalls: 0;
  dbMutations: 0;
  fixtureHash: string;
  splitHash: string | null;
  frozenConfig: Record<string, unknown>;
  resourceScope: EvaluationResourceScope;
  metadataScope: EvaluationMetadataScope;
  topology: EvaluationTopologyReport;
}

export interface RuntimeGroundedEvaluationReport {
  runId: string;
  fixtureHash: string;
  splitHash: string | null;
  frozenConfig: Record<string, unknown>;
  resourceScope: EvaluationResourceScope;
  metadataScope: EvaluationMetadataScope;
  topology: EvaluationTopologyReport;
  report: GroundedEvaluationReport & {
    supportedAnswerRate: number | null;
    firstPassStructuredSuccess: number;
    repairedStructuredSuccess: number | null;
    finalStructuredOutputSuccess: number;
  };
  diagnostics: Array<{
    caseId: string;
    shouldAnswer: boolean;
    providerCalled: boolean;
    corpusResourceIds: string[];
    corpusChunkIds: string[];
    sufficiencyReason: string;
    sufficiencyStatus: "SUFFICIENT" | "INSUFFICIENT";
    selectedEvidence: Array<{
      sourceLabel: string;
      resourceId: string;
      chunkId: string;
      retrievalRank: number;
      exactSignals: string[];
      keywordScore: number | null;
      vectorDistance: number | null;
      fusionScore: number;
    }>;
  }>;
  review: GroundedEvaluationReviewReport;
  cleanup: Awaited<ReturnType<typeof cleanupRuntimeFixtures>>;
}

interface SeedState {
  configurationId: string;
  createdConfiguration: boolean;
}

type HoldoutV3FailurePhase =
  | "PREFLIGHT_FAILURE"
  | "EVALUATOR_SETUP_FAILURE"
  | "EMBEDDING_FAILURE"
  | "RETRIEVAL_FAILURE"
  | "GENERATION_FAILURE"
  | "REPORTING_FAILURE"
  | "COMPLETED";

const FIXTURE_PATH = "lib/ai/grounding/evaluation/fixtures.ts";

export async function runRuntimeGroundedEvaluation(
  options: RuntimeGroundedEvaluationOptions
): Promise<RuntimeGroundedEvaluationReport> {
  const preflight = await prepareRuntimeGroundedEvaluation(options);
  const {
    prisma,
    fixtureHash,
    splitHash,
    cases,
    resources,
    resourceScope,
    metadataScope,
    topology,
    frozenConfig,
  } = preflight;
  const runId = `grounded-runtime-${Date.now()}`;
  const runTimestamp = new Date().toISOString();
  const sourceState = await getSourceState();
  const provider = options.provider ?? getChatModelProvider();
  const embeddingProvider = options.embeddingProvider ?? getConfiguredEmbeddingProvider();
  const answers = new Map<string, GroundedEvaluationAnswer>();
  const diagnostics: RuntimeGroundedEvaluationReport["diagnostics"] = [];
  const reviewCases: GroundedEvaluationReviewCase[] = [];
  let seedState: SeedState | null = null;
  let cleanup: RuntimeGroundedEvaluationReport["cleanup"] | null = null;
  let failurePhase: HoldoutV3FailurePhase = "EVALUATOR_SETUP_FAILURE";
  let acceptanceRecordStarted = false;
  const recordsHoldoutV3Acceptance = shouldRecordHoldoutV3Acceptance(
    options,
    cases
  );
  const recordsHoldoutV4Acceptance = shouldRecordHoldoutV4Acceptance(
    options,
    cases
  );
  const recordsHoldoutAcceptance =
    recordsHoldoutV3Acceptance || recordsHoldoutV4Acceptance;

  try {
    if (recordsHoldoutAcceptance && splitHash) {
      const recordAcceptanceRun = recordsHoldoutV4Acceptance
        ? recordHoldoutV4AcceptanceRun
        : recordHoldoutV3AcceptanceRun;
      await recordAcceptanceRun({
        splitHash,
        runId,
        runTimestamp,
        status: "STARTED",
        reportDir: options.reportDir,
      });
      acceptanceRecordStarted = true;
    }

    await cleanupRuntimeFixtures(prisma, null, resources, metadataScope);
    failurePhase = "EMBEDDING_FAILURE";
    seedState = await seedRuntimeFixtures(
      prisma,
      embeddingProvider,
      resources,
      metadataScope
    );
    const searchRepository = new PostgresResourceSearchRepository(prisma);
    const groundingService = new GroundedGenerationService({
      searchRepository,
      embeddingProvider,
    });

    failurePhase = "RETRIEVAL_FAILURE";
    for (const evaluationCase of cases) {
      const caseCorpusResourceIds = corpusResourceIdsForCase(
        evaluationCase,
        resources
      );
      const answer = await answerRuntimeCase({
        evaluationCase,
        provider,
        groundingService,
        caseCorpusResourceIds,
      });
      answers.set(evaluationCase.id, answer.answer);
      diagnostics.push(answer.diagnostic);
      reviewCases.push(answer.review);
    }

    failurePhase = "REPORTING_FAILURE";
    const report = await runGroundedEvaluation({
      cases,
      split: "all",
      answerCase: async (evaluationCase) => {
        const answer = answers.get(evaluationCase.id);
        if (!answer) throw new Error(`Missing answer for ${evaluationCase.id}.`);
        return answer;
      },
    });

    cleanup = await cleanupRuntimeFixtures(
      prisma,
      seedState,
      resources,
      metadataScope
    );
    const review = buildReviewReport({
      runId,
      runTimestamp,
      fixtureHash,
      splitHash,
      sourceState,
      frozenConfig,
      cases: reviewCases,
    });
    if (recordsHoldoutAcceptance && splitHash) {
      const updateAcceptanceRun = recordsHoldoutV4Acceptance
        ? updateHoldoutV4AcceptanceRun
        : updateHoldoutV3AcceptanceRun;
      await updateAcceptanceRun({
        splitHash,
        runId,
        runTimestamp,
        reportHash: review.reportHash,
        status: "SUCCEEDED",
        failurePhase: "COMPLETED",
        modelEvaluationReached: true,
        chatGenerationReached: true,
        metricsProduced: true,
        reportDir: options.reportDir,
      });
    }
    return {
      runId,
      fixtureHash,
      splitHash,
      frozenConfig,
      resourceScope,
      metadataScope,
      topology,
      report: withRuntimeMetrics(report),
      diagnostics,
      review,
      cleanup,
    };
  } catch (error) {
    if (recordsHoldoutAcceptance && splitHash) {
      const writeRecord = acceptanceRecordStarted
        ? recordsHoldoutV4Acceptance
          ? updateHoldoutV4AcceptanceRun
          : updateHoldoutV3AcceptanceRun
        : recordsHoldoutV4Acceptance
          ? recordHoldoutV4AcceptanceRun
          : recordHoldoutV3AcceptanceRun;
      await writeRecord({
        splitHash,
        runId,
        runTimestamp,
        status: "FAILED",
        errorClass: safeErrorClass(error),
        failurePhase,
        modelEvaluationReached: false,
        chatGenerationReached: false,
        metricsProduced: false,
        reportDir: options.reportDir,
      }).catch(() => undefined);
    }
    throw error;
  } finally {
    if (!cleanup) {
      await cleanupRuntimeFixtures(
        prisma,
        seedState,
        resources,
        metadataScope
      ).catch(() => undefined);
    }
  }
}

export async function runRuntimeGroundedEvaluationPreflight(
  options: RuntimeGroundedEvaluationOptions
): Promise<RuntimeGroundedEvaluationPreflightReport> {
  const preflight = await prepareRuntimeGroundedEvaluation(options);
  return {
    dryRun: true,
    providerCalls: 0,
    dbMutations: 0,
    fixtureHash: preflight.fixtureHash,
    splitHash: preflight.splitHash,
    frozenConfig: preflight.frozenConfig,
    resourceScope: preflight.resourceScope,
    metadataScope: preflight.metadataScope,
    topology: preflight.topology,
  };
}

async function prepareRuntimeGroundedEvaluation(
  options: RuntimeGroundedEvaluationOptions
) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Runtime grounding evaluation is not available in production.");
  }

  const prisma = options.prisma ?? defaultPrisma;
  const fixtureHash = await hashFixtureFile();
  const cases = selectCases(options.split, options.caseIds).slice(
    0,
    options.maxCases ?? undefined
  );
  const splitHash = computeSelectedHoldoutSplitHash(cases);
  const resourceUniverse = selectEvaluationResourceUniverseForCases(
    cases,
    groundedEvaluationCases,
    groundedEvaluationResources
  );
  const resources = resolveEvaluationResourcesForSplit(
    cases,
    resourceUniverse
  );
  const resourceScope = buildEvaluationResourceScope({
    split: options.split,
    cases,
    allResources: resourceUniverse,
    resolvedResources: resources,
  });
  assertEvaluationResourceScope(resourceScope);
  const metadataScope = resolveEvaluationMetadataForCases(cases, resources);
  const topology = buildEvaluationTopologyReport({ cases, metadataScope });
  assertEvaluationTopology(topology);
  await enforceHoldoutGuard(options, fixtureHash, splitHash, cases);

  return {
    prisma,
    fixtureHash,
    splitHash,
    cases,
    resources,
    resourceScope,
    metadataScope,
    topology,
    frozenConfig: buildFrozenConfig(),
  };
}

function selectCases(split: GroundedEvaluationSplit | "all", caseIds?: string[]) {
  const cases =
    split === "all"
      ? groundedEvaluationCases
      : groundedEvaluationCases.filter((item) => item.split === split);
  if (!caseIds || caseIds.length === 0) return cases;

  const requested = new Set(caseIds);
  const selected = cases.filter((item) => requested.has(item.id));
  const found = new Set(selected.map((item) => item.id));
  const missing = caseIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new Error(`Unknown grounded evaluation case id(s): ${missing.join(", ")}.`);
  }

  return selected;
}

function selectEvaluationResourceUniverseForCases(
  cases: GroundedEvaluationCase[],
  allCases: GroundedEvaluationCase[],
  allResources: GroundedEvaluationResource[]
) {
  const selectedSplits = new Set(cases.map((item) => item.split));
  if (selectedSplits.has(HOLDOUT_V4_SPLIT)) return allResources;

  if (selectedSplits.has(HOLDOUT_V3_SPLIT)) {
    const futureResourceIds = collectReferencedResourceIdsForCases(
      allCases.filter((item) => item.split === HOLDOUT_V4_SPLIT),
      allResources
    );
    return allResources.filter((item) => !futureResourceIds.has(item.id));
  }

  return allResources;
}

function collectReferencedResourceIdsForCases(
  cases: GroundedEvaluationCase[],
  allResources: GroundedEvaluationResource[]
) {
  const resourcesByChunkId = new Map(
    allResources.map((item) => [item.chunkId, item])
  );
  const resourceIds = new Set<string>();

  for (const evaluationCase of cases) {
    for (const resourceId of [
      ...(evaluationCase.expectedResourceIds ?? []),
      ...(evaluationCase.setupResourceIds ?? []),
    ]) {
      resourceIds.add(resourceId);
    }
    for (const chunkId of evaluationCase.expectedChunkIds ?? []) {
      const resource = resourcesByChunkId.get(chunkId);
      if (resource) resourceIds.add(resource.id);
    }
  }

  return resourceIds;
}

function computeSelectedHoldoutSplitHash(cases: GroundedEvaluationCase[]) {
  if (cases.some((item) => item.split === HOLDOUT_V3_SPLIT)) {
    return computeHoldoutV3SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
  }
  if (cases.some((item) => item.split === HOLDOUT_V4_SPLIT)) {
    return computeHoldoutV4SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
  }
  return null;
}

async function enforceHoldoutGuard(
  options: RuntimeGroundedEvaluationOptions,
  fixtureHash: string,
  splitHash: string | null,
  cases: GroundedEvaluationCase[]
) {
  const includesHoldoutV3 = cases.some((item) => item.split === HOLDOUT_V3_SPLIT);
  const includesHoldoutV4 = cases.some((item) => item.split === HOLDOUT_V4_SPLIT);
  if (includesHoldoutV3) {
    if (!splitHash) {
      throw new Error("holdout_v3 split hash could not be computed.");
    }
    if (options.split !== HOLDOUT_V3_SPLIT && !options.allowConsumedHoldoutDiagnostic) {
      throw new Error("holdout_v3 must be executed explicitly, not through a mixed split.");
    }
    await assertHoldoutV3AcceptanceRunAllowed({
      confirmSplitHash: options.confirmHoldoutFixtureHash,
      computedSplitHash: splitHash,
      allowDiagnostic: options.allowConsumedHoldoutDiagnostic,
      caseIds: options.caseIds,
      maxCases: options.maxCases,
      reportDir: options.reportDir,
    });
    if (!options.allowConsumedHoldoutDiagnostic) {
      assertHoldoutV3FrozenRuntimeConfig(buildFrozenConfig());
    }
    return;
  }
  if (includesHoldoutV4) {
    if (!splitHash) {
      throw new Error("holdout_v4 split hash could not be computed.");
    }
    if (options.split !== HOLDOUT_V4_SPLIT && !options.allowConsumedHoldoutDiagnostic) {
      throw new Error("holdout_v4 must be executed explicitly, not through a mixed split.");
    }
    await assertHoldoutV4AcceptanceRunAllowed({
      confirmSplitHash: options.confirmHoldoutFixtureHash,
      computedSplitHash: splitHash,
      allowDiagnostic: options.allowConsumedHoldoutDiagnostic,
      caseIds: options.caseIds,
      maxCases: options.maxCases,
      reportDir: options.reportDir,
    });
    if (!options.allowConsumedHoldoutDiagnostic) {
      assertHoldoutV4FrozenRuntimeConfig(buildFrozenConfig());
    }
    return;
  }

  if (options.split !== "holdout" && options.split !== "holdout_v2") return;

  if (options.confirmHoldoutFixtureHash !== fixtureHash) {
    throw new Error("Holdout run requires explicit matching fixture hash confirmation.");
  }

  if (options.split === "holdout" && !options.allowConsumedHoldoutDiagnostic) {
    throw new Error(
      "The original holdout split is consumed. Use diagnostic mode only, or run a newly approved holdout split."
    );
  }
}

function assertHoldoutV3FrozenRuntimeConfig(config: Record<string, unknown>) {
  const expected = HOLDOUT_V3_FROZEN_CONFIG;
  const checks: Array<[string, unknown]> = [
    ["promptVersion", expected.prompt],
    ["groundingVersion", expected.grounding],
    ["sufficiencyPolicyVersion", expected.sufficiency],
    ["groundingValidatorVersion", expected.validator],
    ["featureFlagEnabledForOrdinaryUsers", expected.featureFlagDefault],
    ["chatProvider", expected.chatProvider],
    ["chatModel", expected.chatModel],
    ["embeddingProvider", expected.embeddingProvider],
    ["embeddingModel", expected.embeddingModel],
    ["embeddingDimensions", expected.embeddingDimensions],
    ["embeddingVersion", expected.embeddingVersion],
    ["temperature", expected.temperature],
    ["maxOutputTokens", expected.maxOutputTokens],
    ["repairAttemptLimit", expected.repairLimit],
    ["keywordCandidateCount", expected.keywordCandidateCount],
    ["vectorCandidateCount", expected.vectorCandidateCount],
    ["hybridRrfK", expected.rrfK],
    ["retrievalLimit", expected.retrievalResultLimit],
    ["selectedEvidenceLimit", expected.selectedEvidenceLimit],
    ["evidenceTokenBudget", expected.evidenceTokenBudget],
    ["recentMessageLimit", expected.recentMessageLimit],
    ["queryContextTokenBudget", expected.queryContextTokenBudget],
    ["retrievalQueryMaxChars", expected.queryMaxLength],
    ["exactSignalConfiguration", expected.exactSignalConfiguration],
    ["conceptCompatibilityConfiguration", expected.conceptCompatibilityConfiguration],
    [
      "externalInformationGuardConfiguration",
      expected.externalInformationGuardConfiguration,
    ],
  ];
  const mismatches = checks.filter(
    ([key, expectedValue]) =>
      JSON.stringify(config[key]) !== JSON.stringify(expectedValue)
  );

  if (mismatches.length > 0) {
    throw new Error(
      `holdout_v3 frozen config mismatch: ${mismatches
        .map(([key]) => key)
        .join(", ")}`
    );
  }
}

function assertHoldoutV4FrozenRuntimeConfig(config: Record<string, unknown>) {
  const expected = HOLDOUT_V4_FROZEN_CONFIG;
  const checks: Array<[string, unknown]> = [
    ["promptVersion", expected.prompt],
    ["groundingVersion", expected.grounding],
    ["sufficiencyPolicyVersion", expected.sufficiency],
    ["groundingValidatorVersion", expected.validator],
    ["featureFlagEnabledForOrdinaryUsers", expected.featureFlagDefault],
    ["chatProvider", expected.chatProvider],
    ["chatModel", expected.chatModel],
    ["embeddingProvider", expected.embeddingProvider],
    ["embeddingModel", expected.embeddingModel],
    ["embeddingDimensions", expected.embeddingDimensions],
    ["embeddingVersion", expected.embeddingVersion],
    ["temperature", expected.temperature],
    ["maxOutputTokens", expected.maxOutputTokens],
    ["repairAttemptLimit", expected.repairLimit],
    ["keywordCandidateCount", expected.keywordCandidateCount],
    ["vectorCandidateCount", expected.vectorCandidateCount],
    ["hybridRrfK", expected.rrfK],
    ["retrievalLimit", expected.retrievalResultLimit],
    ["selectedEvidenceLimit", expected.selectedEvidenceLimit],
    ["evidenceTokenBudget", expected.evidenceTokenBudget],
    ["recentMessageLimit", expected.recentMessageLimit],
    ["queryContextTokenBudget", expected.queryContextTokenBudget],
    ["retrievalQueryMaxChars", expected.queryMaxLength],
    ["correctedHarness", expected.correctedHarness],
    ["exactSignalConfiguration", expected.exactSignalConfiguration],
    ["conceptCompatibilityConfiguration", expected.conceptCompatibilityConfiguration],
    [
      "externalInformationGuardConfiguration",
      expected.externalInformationGuardConfiguration,
    ],
  ];
  const mismatches = checks.filter(
    ([key, expectedValue]) =>
      JSON.stringify(config[key]) !== JSON.stringify(expectedValue)
  );

  if (mismatches.length > 0) {
    throw new Error(
      `holdout_v4 frozen config mismatch: ${mismatches
        .map(([key]) => key)
        .join(", ")}`
    );
  }
}

function shouldRecordHoldoutV3Acceptance(
  options: RuntimeGroundedEvaluationOptions,
  cases: GroundedEvaluationCase[]
) {
  return (
    options.split === HOLDOUT_V3_SPLIT &&
    !options.allowConsumedHoldoutDiagnostic &&
    !options.caseIds?.length &&
    !options.maxCases &&
    cases.every((item) => item.split === HOLDOUT_V3_SPLIT)
  );
}

function shouldRecordHoldoutV4Acceptance(
  options: RuntimeGroundedEvaluationOptions,
  cases: GroundedEvaluationCase[]
) {
  return (
    options.split === HOLDOUT_V4_SPLIT &&
    !options.allowConsumedHoldoutDiagnostic &&
    !options.caseIds?.length &&
    !options.maxCases &&
    cases.every((item) => item.split === HOLDOUT_V4_SPLIT)
  );
}

async function answerRuntimeCase(input: {
  evaluationCase: GroundedEvaluationCase;
  provider: ChatModelProvider;
  groundingService: GroundedGenerationService;
  caseCorpusResourceIds: string[];
}) {
  const lastMessage = input.evaluationCase.messages.at(-1);
  if (!lastMessage) throw new Error(`Case ${input.evaluationCase.id} has no message.`);

  const context = {
    chatId: `runtime-chat-${input.evaluationCase.id}`,
    userMessageId: `runtime-user-${input.evaluationCase.id}`,
    assistantMessageId: `runtime-assistant-${input.evaluationCase.id}`,
    generationRequestId: `runtime-request-${input.evaluationCase.id}`,
    attemptNumber: 1,
    userMessage: lastMessage.content,
    subjectId: input.evaluationCase.subjectId,
    subjectName: subjectName(input.evaluationCase.subjectId),
    topicId: input.evaluationCase.topicId,
    topicTitle: topicTitle(input.evaluationCase.topicId),
    recentMessages: input.evaluationCase.messages.slice(0, -1),
    retrievalResourceIds: input.caseCorpusResourceIds,
  };

  const outcome = await input.groundingService.generate({
    context,
    provider: input.provider,
  });
  const diagnostic = await buildCaseDiagnostic(
    input.evaluationCase,
    input.caseCorpusResourceIds
  );

  if (outcome.kind === "COMPLETED") {
    const citations = outcome.citations.map((citation) => ({
      sourceLabel: citation.sourceLabel,
      resourceId: citation.evidence.chunk.resourceId,
      chunkId: citation.evidence.chunk.id,
      subjectId: citation.evidence.chunk.subjectId ?? undefined,
      topicId: citation.evidence.chunk.topicId ?? undefined,
    }));
    return {
      answer: {
        answer: outcome.content,
        insufficientContext: false,
        citations,
        repairAttempted: outcome.repairAttempted,
        regenerationUsed: outcome.groundingValidation?.regenerationUsed,
        successfulRepair: outcome.groundingValidation?.regenerationUsed === true,
        answerSegments: outcome.answerSegments ?? [],
        groundingValidatorResults: outcome.groundingValidation?.finalResults ?? [],
        retrievalLatencyMs: outcome.attempt.retrievalDurationMs,
        generationLatencyMs: outcome.attempt.generationDurationMs,
        inputTokens: outcome.usage?.inputTokens,
        outputTokens: outcome.usage?.outputTokens,
        estimatedCostUsd: estimateCostUsd(
          outcome.usage?.inputTokens ?? 0,
          outcome.usage?.outputTokens ?? 0
        ),
      },
      diagnostic: { ...diagnostic, providerCalled: true },
      review: buildReviewCase({
        evaluationCase: input.evaluationCase,
        actualClassification: "SUPPORTED",
        generatedAnswerText: outcome.content,
        citations,
        citedExcerpts: outcome.citations.map((citation) => ({
          ...citations.find((item) => item.sourceLabel === citation.sourceLabel)!,
          excerpt: citation.evidence.chunk.content,
          excerptTruncated: false,
        })),
        answerSegments: outcome.answerSegments ?? [],
        groundingValidatorResults: outcome.groundingValidation?.finalResults ?? [],
        regenerationUsed: outcome.groundingValidation?.regenerationUsed,
        originalUnsupportedSegmentIndices:
          outcome.groundingValidation?.originalUnsupportedSegmentIndices,
        insufficiencyReason: null,
        versions: reviewVersions(),
        provider: outcome.provider,
        model: outcome.model,
        repairUsed: outcome.repairAttempted,
        inputTokens: outcome.usage?.inputTokens,
        outputTokens: outcome.usage?.outputTokens,
      }),
    };
  }

  if (outcome.kind === "INSUFFICIENT_CONTEXT") {
    const providerCalled =
      typeof outcome.attempt.generationDurationMs === "number";
    return {
      answer: {
        answer: outcome.content,
        insufficientContext: true,
        citations: [],
        repairAttempted: false,
        retrievalLatencyMs: outcome.attempt.retrievalDurationMs,
        generationLatencyMs: outcome.attempt.generationDurationMs,
        estimatedCostUsd: 0,
      },
      diagnostic: { ...diagnostic, providerCalled },
      review: buildReviewCase({
        evaluationCase: input.evaluationCase,
        actualClassification: "INSUFFICIENT_CONTEXT",
        generatedAnswerText: outcome.content,
        citations: [],
        citedExcerpts: [],
        insufficiencyReason: outcome.attempt.sufficiencyReason,
        versions: reviewVersions(),
        provider: configuredChatProviderName(),
        model: configuredChatModelName(),
        repairUsed: false,
      }),
    };
  }

  if (outcome.kind === "FAILED") {
    const providerCalled =
      typeof outcome.attempt?.generationDurationMs === "number";
    return {
      answer: {
        answer: "",
        insufficientContext: false,
        citations: [],
        structuredOutputFailed: true,
        unsupportedSegmentFailed:
          outcome.failureCode === AiGenerationFailureCode.UNSUPPORTED_GENERATED_CLAIM,
        repairAttempted: false,
        regenerationUsed: outcome.attempt?.groundingValidation?.regenerationUsed,
        successfulRepair: false,
        answerSegments: outcome.attempt?.answerSegments ?? [],
        groundingValidatorResults:
          outcome.attempt?.groundingValidation?.finalResults ?? [],
        retrievalLatencyMs: outcome.attempt?.retrievalDurationMs,
        generationLatencyMs: outcome.attempt?.generationDurationMs,
        estimatedCostUsd: 0,
      },
      diagnostic: { ...diagnostic, providerCalled },
      review: buildReviewCase({
        evaluationCase: input.evaluationCase,
        actualClassification: "FAILED",
        generatedAnswerText: "",
        citations: [],
        citedExcerpts: [],
        answerSegments: outcome.attempt?.answerSegments ?? [],
        groundingValidatorResults:
          outcome.attempt?.groundingValidation?.finalResults ?? [],
        regenerationUsed: outcome.attempt?.groundingValidation?.regenerationUsed,
        originalUnsupportedSegmentIndices:
          outcome.attempt?.groundingValidation?.originalUnsupportedSegmentIndices,
        insufficiencyReason: outcome.attempt?.sufficiencyReason,
        versions: reviewVersions(),
        provider: configuredChatProviderName(),
        model: configuredChatModelName(),
        repairUsed: false,
      }),
    };
  }

  return {
    answer: {
      answer: outcome.content,
      insufficientContext: true,
      citations: [],
      repairAttempted: false,
      estimatedCostUsd: 0,
    },
    diagnostic: { ...diagnostic, providerCalled: false },
    review: buildReviewCase({
      evaluationCase: input.evaluationCase,
      actualClassification: "INSUFFICIENT_CONTEXT",
      generatedAnswerText: outcome.content,
      citations: [],
      citedExcerpts: [],
      insufficiencyReason: null,
      versions: reviewVersions(),
      provider: null,
      model: null,
      repairUsed: false,
    }),
  };
}

async function buildCaseDiagnostic(
  evaluationCase: GroundedEvaluationCase,
  caseCorpusResourceIds: string[]
) {
  const searchRepository = new PostgresResourceSearchRepository();
  const embeddingProvider = getConfiguredEmbeddingProvider();
  const lastMessage = evaluationCase.messages.at(-1);
  const query = buildStandaloneRetrievalQuery({
    message: lastMessage?.content ?? "",
    subjectName: subjectName(evaluationCase.subjectId),
    topicTitle: topicTitle(evaluationCase.topicId),
    recentMessages: evaluationCase.messages.slice(0, -1),
  });
  const queryEmbedding = await embeddingProvider.embedQuery(query);
  const candidates = await searchRepository.hybridSearch({
    query,
    queryEmbedding,
    filters: {
      ...(evaluationCase.subjectId ? { subjectId: evaluationCase.subjectId } : {}),
      ...(evaluationCase.topicId ? { topicId: evaluationCase.topicId } : {}),
      ...(caseCorpusResourceIds.length
        ? { resourceIds: caseCorpusResourceIds }
        : {}),
    },
    keywordLimit: 40,
    vectorLimit: 40,
    limit: 20,
  });
  const evidence = selectGroundingEvidence({ candidates, query });
  const sufficiency = evaluateRetrievalSufficiency({
    query,
    candidates,
    selectedChunks: evidence.map((item) => item.chunk),
    subjectId: evaluationCase.subjectId,
    topicId: evaluationCase.topicId,
  });

  return {
    caseId: evaluationCase.id,
    shouldAnswer: evaluationCase.shouldAnswer,
    providerCalled: false,
    corpusResourceIds: caseCorpusResourceIds,
    corpusChunkIds: candidates.map((item) => item.id),
    sufficiencyReason: sufficiency.reason,
    sufficiencyStatus: sufficiency.sufficient
      ? ("SUFFICIENT" as const)
      : ("INSUFFICIENT" as const),
    selectedEvidence: evidence.map((item) => ({
      sourceLabel: item.sourceLabel,
      resourceId: item.chunk.resourceId,
      chunkId: item.chunk.id,
      retrievalRank: item.retrievalRank,
      exactSignals: item.chunk.exactSignals.slice(0, 10),
      keywordScore: item.chunk.keywordScore,
      vectorDistance: item.chunk.vectorDistance,
      fusionScore: item.chunk.fusionScore,
    })),
  };
}

async function seedRuntimeFixtures(
  prisma: PrismaClient,
  embeddingProvider: EmbeddingProvider,
  resources: GroundedEvaluationResource[],
  metadataScope: EvaluationMetadataScope
): Promise<SeedState> {
  for (const subjectId of metadataScope.subjectIds) {
    await prisma.subject.create({
      data: {
        id: subjectId,
        name: subjectName(subjectId) ?? subjectId,
        examCode: `EVAL-${subjectId.replace("eval-subject-", "").toUpperCase()}`,
      },
    });
  }

  for (const topic of metadataScope.topics) {
    await prisma.topic.upsert({
      where: { id: topic.id },
      create: {
        id: topic.id,
        subjectId: topic.subjectId,
        title: topicTitle(topic.id) ?? topic.id,
      },
      update: {},
    });
  }

  for (const resource of resources) {
    const contentHash = hashText(resource.content);
    const searchText = [
      resource.title,
      resource.chunkType,
      resource.questionNumber ? `Question ${resource.questionNumber}` : "",
      resource.content,
    ].filter(Boolean).join("\n");

    await prisma.resource.create({
      data: {
        id: resource.id,
        sourceKind: ResourceSourceKind.UPLOAD,
        title: resource.title,
        subjectId: resource.subjectId,
        topicId: resource.topicId ?? null,
        contentHash,
        activeChunkVersion: 1,
        activeChunkSetHash: hashText(`${resource.chunkId}:${contentHash}`),
        processingVersion: 1,
        processingStatus: ResourceProcessingStatus.PROCESSED,
        approvalStatus: ResourceApprovalStatus.APPROVED,
        extractionQuality: ResourceExtractionQuality.HIGH,
        extractionWarnings: [],
        provenance: resource.provenance,
        usageRights: resource.usageRights,
        processedAt: new Date(),
        approvedAt: new Date(),
        chunks: {
          create: {
            id: resource.chunkId,
            version: 1,
            subjectId: resource.subjectId,
            topicId: resource.topicId ?? null,
            chunkType: resource.chunkType,
            chunkIndex: 0,
            title: resource.title,
            content: resource.content,
            tokenEstimate: estimateTokens(resource.content),
            questionNumber: resource.questionNumber ?? null,
            contentHash,
            searchText,
            metadata: resource.notes ? { notes: resource.notes } : {},
          },
        },
      },
    });
  }

  const providerConfig = {
    provider: embeddingProvider.getProviderName(),
    model: embeddingProvider.getModelName(),
    dimensions: embeddingProvider.getDimensions(),
    embeddingVersion: Number(process.env.AI_EMBEDDING_VERSION ?? 1),
  };
  const existingConfiguration =
    await prisma.resourceEmbeddingConfiguration.findUnique({
      where: { provider_model_dimensions_embeddingVersion: providerConfig },
    });
  const configuration =
    existingConfiguration ??
    await prisma.resourceEmbeddingConfiguration.create({
      data: {
        ...providerConfig,
        status: "ACTIVE",
        activatedAt: new Date(),
        eligibleChunkCount: resources.length,
        completedChunkCount: resources.length,
      },
    });

  if (existingConfiguration && existingConfiguration.status !== "ACTIVE") {
    throw new Error("Matching embedding configuration exists but is not active.");
  }

  const vectors = await embeddingProvider.embedDocuments(
    resources.map((item) => item.content)
  );
  for (const [index, resource] of resources.entries()) {
    const vector = vectors[index];
    if (!vector) throw new Error(`Missing embedding for ${resource.id}.`);
    await prisma.$executeRaw`
      INSERT INTO "ResourceChunkEmbedding" (
        "id",
        "resourceChunkId",
        "configurationId",
        "contentHash",
        "status",
        "attemptCount",
        "embedding",
        "createdAt",
        "updatedAt",
        "completedAt"
      )
      VALUES (
        ${randomUUID()},
        ${resource.chunkId},
        ${configuration.id},
        ${hashText(resource.content)},
        ${"COMPLETED"}::"ResourceChunkEmbeddingStatus",
        1,
        ${toVectorLiteral(vector)}::extensions.vector,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("resourceChunkId", "configurationId", "contentHash") DO NOTHING
    `;
  }

  return {
    configurationId: configuration.id,
    createdConfiguration: !existingConfiguration,
  };
}

async function cleanupRuntimeFixtures(
  prisma: PrismaClient,
  seedState: SeedState | null,
  resources: GroundedEvaluationResource[],
  metadataScope?: EvaluationMetadataScope
) {
  const resourceIds = resources.map((item) => item.id);
  const chunkIds = resources.map((item) => item.chunkId);
  const topicIds =
    metadataScope?.topics.map((item) => item.id) ??
    unique(resources.flatMap((item) => (item.topicId ? [item.topicId] : [])));
  const subjectIds =
    metadataScope?.subjectIds ?? unique(resources.map((item) => item.subjectId));
  const resourceDelete = await prisma.resource.deleteMany({
    where: { id: { in: resourceIds } },
  });
  const embeddingDelete = await prisma.resourceChunkEmbedding.deleteMany({
    where: {
      resourceChunkId: {
        in: chunkIds,
      },
    },
  });
  const configDelete =
    seedState?.createdConfiguration
      ? await prisma.resourceEmbeddingConfiguration.deleteMany({
          where: { id: seedState.configurationId },
        })
      : { count: 0 };
  const topicDelete = await prisma.topic.deleteMany({
    where: { id: { in: topicIds } },
  });
  const subjectDelete = await prisma.subject.deleteMany({
    where: { id: { in: subjectIds } },
  });

  return {
    resourceDelete: resourceDelete.count,
    embeddingDelete: embeddingDelete.count,
    configDelete: configDelete.count,
    topicDelete: topicDelete.count,
    subjectDelete: subjectDelete.count,
    remaining: {
      resources: await prisma.resource.count({
        where: { id: { in: resourceIds } },
      }),
      chunks: await prisma.resourceChunk.count({
        where: { id: { in: chunkIds } },
      }),
      embeddings: await prisma.resourceChunkEmbedding.count({
        where: {
          resourceChunkId: { in: chunkIds },
        },
      }),
      configs: seedState?.createdConfiguration
        ? await prisma.resourceEmbeddingConfiguration.count({
            where: { id: seedState.configurationId },
          })
        : 0,
    },
  };
}

function withRuntimeMetrics(report: GroundedEvaluationReport) {
  const supportedCases = report.results.filter((item) => item.shouldAnswer);
  const repairCases = report.results.filter((item) => item.repairAttempted);
  return {
    ...report,
    supportedAnswerRate:
      supportedCases.length === 0
        ? null
        : supportedCases.filter((item) => item.didAnswer).length / supportedCases.length,
    firstPassStructuredSuccess:
      1 -
      report.results.filter(
        (item) => item.structuredOutputFailed && !item.repairAttempted
      ).length /
        Math.max(1, report.results.length),
    repairedStructuredSuccess:
      repairCases.length === 0
        ? null
        : 1 -
          repairCases.filter((item) => item.structuredOutputFailed).length /
            repairCases.length,
    finalStructuredOutputSuccess: 1 - report.structuredOutputFailureRate,
  };
}

function buildFrozenConfig() {
  return {
    promptVersion: GROUNDED_PROMPT_VERSION,
    groundingVersion: GROUNDING_VERSION,
    sufficiencyPolicyVersion: SUFFICIENCY_POLICY_VERSION,
    groundingValidatorVersion: GROUNDING_VALIDATOR_VERSION,
    featureFlagEnabledForOrdinaryUsers: isGroundedChatEnabled(),
    chatProvider: process.env.AI_CHAT_PROVIDER ?? "openai",
    chatModel: process.env.AI_CHAT_MODEL ?? "gpt-4o-mini",
    embeddingProvider: process.env.AI_EMBEDDING_PROVIDER ?? "openai",
    embeddingModel: process.env.AI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    embeddingDimensions: Number(process.env.AI_EMBEDDING_DIMENSIONS ?? 1536),
    embeddingVersion: Number(process.env.AI_EMBEDDING_VERSION ?? 1),
    temperature: 0.2,
    maxOutputTokens: 700,
    repairAttemptLimit: 1,
    keywordCandidateCount: 40,
    vectorCandidateCount: 40,
    hybridRrfK: 60,
    retrievalLimit: 20,
    selectedEvidenceLimit: DEFAULT_MAX_EVIDENCE_CHUNKS,
    evidenceTokenBudget: DEFAULT_EVIDENCE_TOKEN_BUDGET,
    recentMessageLimit: QUERY_CONTEXT_MESSAGE_LIMIT,
    queryContextTokenBudget: QUERY_CONTEXT_TOKEN_LIMIT,
    retrievalQueryMaxChars: RETRIEVAL_QUERY_MAX_CHARS,
    correctedHarness: HOLDOUT_V4_FROZEN_CONFIG.correctedHarness,
    exactSignalConfiguration: HOLDOUT_V3_FROZEN_CONFIG.exactSignalConfiguration,
    conceptCompatibilityConfiguration:
      HOLDOUT_V3_FROZEN_CONFIG.conceptCompatibilityConfiguration,
    externalInformationGuardConfiguration:
      HOLDOUT_V3_FROZEN_CONFIG.externalInformationGuardConfiguration,
  };
}

function reviewVersions() {
  return {
    prompt: GROUNDED_PROMPT_VERSION,
    grounding: GROUNDING_VERSION,
    sufficiency: SUFFICIENCY_POLICY_VERSION,
  };
}

function configuredChatProviderName() {
  return process.env.AI_CHAT_PROVIDER ?? "openai";
}

function configuredChatModelName() {
  return process.env.AI_CHAT_MODEL ?? "gpt-4o-mini";
}

async function getSourceState(): Promise<GroundedEvaluationReportSourceState> {
  const commit = await readGitOutput(["rev-parse", "HEAD"]);
  const diff = await readGitOutput(["diff", "--binary", "HEAD", "--"]);
  return {
    commit,
    diffHash: hashText(diff ?? ""),
    dirty: Boolean(diff),
  };
}

async function readGitOutput(args: string[]) {
  try {
    const result = await execFile("git", args, {
      cwd: process.cwd(),
      maxBuffer: 20 * 1024 * 1024,
    });
    return result.stdout.trim();
  } catch {
    return null;
  }
}

async function hashFixtureFile() {
  const fixturePath = path.join(process.cwd(), FIXTURE_PATH);
  return hashText(await fs.readFile(fixturePath, "utf8"));
}

function subjectName(subjectId: string | undefined | null) {
  if (!subjectId) return null;
  return (
    {
      "eval-subject-mathematics": "Mathematics",
      "eval-subject-physics": "Physics",
      "eval-subject-chemistry": "Chemistry",
      "eval-subject-biology": "Biology",
      "eval-subject-english": "English",
    } satisfies Record<string, string>
  )[subjectId] ?? subjectId.replace(/^eval-subject-/, "").replace(/-/g, " ");
}

function topicTitle(topicId: string | undefined | null) {
  if (!topicId) return null;
  return topicId
    .replace(/^eval-topic-/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeErrorClass(error: unknown) {
  if (error instanceof Error && error.name) return error.name;
  return "UNKNOWN_ERROR";
}

function estimateTokens(value: string) {
  return Math.max(1, Math.ceil(value.split(/\s+/).length * 1.33));
}

function estimateCostUsd(inputTokens: number, outputTokens: number) {
  return inputTokens * 0.00000015 + outputTokens * 0.0000006;
}

function toVectorLiteral(vector: number[]) {
  return `[${vector.map((value) => Number(value).toPrecision(12)).join(",")}]`;
}
