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
import type { GroundedGenerationOutcome } from "@/lib/ai/grounding/grounded-generation-service";
import {
  CAPABILITY_GROUNDED_PROMPT_VERSION,
  CAPABILITY_GROUNDING_VERSION,
  GROUNDING_VALIDATOR_VERSION,
  GROUNDED_PROMPT_VERSION,
  GROUNDING_VERSION,
  SUFFICIENCY_POLICY_VERSION,
  isGroundedChatEnabled,
  resolveGroundingPipelineKind,
  type GroundingPipelineKind,
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
import type {
  ResourceSearchRepository,
} from "@/lib/resources/retrieval/types";
import { selectGroundingPipeline } from "@/lib/ai/grounding/pipelines/select-grounding-pipeline";
import type {
  CapabilityGroundingOutcome,
  CapabilityPipelineDiagnostics,
  GroundingPipeline,
} from "@/lib/ai/grounding/pipelines/types";
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
  HOLDOUT_V5_FROZEN_CONFIG,
  HOLDOUT_V5_SPLIT,
  assertHoldoutV5AcceptanceRunAllowed,
  computeHoldoutV5SplitHash,
  recordHoldoutV5AcceptanceRun,
  updateHoldoutV5AcceptanceRun,
} from "./holdout-v5";
import {
  HOLDOUT_V6_BEHAVIOR_FILE_PATHS,
  HOLDOUT_V6_FROZEN_CONFIG,
  HOLDOUT_V6_SPLIT,
  assertHoldoutV6AcceptanceRunAllowed,
  computeHoldoutV6SplitHash,
  recordHoldoutV6AcceptanceRun,
  updateHoldoutV6AcceptanceRun,
} from "./holdout-v6";
import {
  STAGE41_CAPABILITY_BEHAVIOR_FILE_PATHS,
  STAGE41_CAPABILITY_BEHAVIOR_HASH_ALGORITHM,
} from "./stage41-behavior";
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
  GroundedEvaluationCapabilityDiagnostics,
  GroundedEvaluationClassification,
  GroundedEvaluationPipeline,
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
  pipeline?: GroundedEvaluationPipeline;
  provider?: ChatModelProvider;
  providerLabel?: string;
  providerModelLabel?: string;
  embeddingProvider?: EmbeddingProvider;
  embeddingProviderLabel?: string;
  embeddingModelLabel?: string;
  embeddingDimensionsLabel?: number;
  prisma?: PrismaClient;
  allowConsumedHoldoutDiagnostic?: boolean;
  confirmHoldoutFixtureHash?: string;
  maxCases?: number;
  reportDir?: string;
}

export interface RuntimeGroundedEvaluationPreflightReport {
  dryRun: true;
  pipeline: GroundedEvaluationPipeline;
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
  pipeline: GroundedEvaluationPipeline;
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
    pipeline: GroundedEvaluationPipeline;
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
      subjectId: string | null;
      topicId: string | null;
      retrievalRank: number;
      exactSignals: string[];
      keywordScore: number | null;
      vectorDistance: number | null;
      fusionScore: number;
    }>;
    capabilityDiagnostics?: GroundedEvaluationCapabilityDiagnostics;
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
    pipeline,
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
  const sourceState = await getSourceState(pipeline);
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
  const recordsHoldoutV5Acceptance = shouldRecordHoldoutV5Acceptance(
    options,
    cases
  );
  const recordsHoldoutV6Acceptance = shouldRecordHoldoutV6Acceptance(
    options,
    cases
  );
  const recordsHoldoutAcceptance =
    recordsHoldoutV3Acceptance ||
    recordsHoldoutV4Acceptance ||
    recordsHoldoutV5Acceptance ||
    recordsHoldoutV6Acceptance;

  try {
    if (recordsHoldoutAcceptance && splitHash) {
      if (recordsHoldoutV6Acceptance) {
        await recordHoldoutV6AcceptanceRun({
          splitHash,
          fixtureHash,
          candidateHead: sourceState.commit,
          candidateDiffHash: sourceState.diffHash,
          candidateTreeHash: sourceState.treeHash,
          candidateBehaviorHash: sourceState.behaviorHash,
          behaviorFilePaths: sourceState.behaviorFilePaths,
          runId,
          runTimestamp,
          status: "STARTED",
          reportDir: options.reportDir,
        });
      } else if (recordsHoldoutV5Acceptance) {
        await recordHoldoutV5AcceptanceRun({
          splitHash,
          fixtureHash,
          candidateHead: sourceState.commit,
          candidateDiffHash: sourceState.diffHash,
          runId,
          runTimestamp,
          status: "STARTED",
          reportDir: options.reportDir,
        });
      } else if (recordsHoldoutV4Acceptance) {
        await recordHoldoutV4AcceptanceRun({
          splitHash,
          runId,
          runTimestamp,
          status: "STARTED",
          reportDir: options.reportDir,
        });
      } else {
        await recordHoldoutV3AcceptanceRun({
          splitHash,
          runId,
          runTimestamp,
          status: "STARTED",
          reportDir: options.reportDir,
        });
      }
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
    const groundingPipeline = selectGroundingPipeline({
      searchRepository,
      embeddingProvider,
    }, pipeline);

    failurePhase = "RETRIEVAL_FAILURE";
    for (const evaluationCase of cases) {
      const caseCorpusResourceIds = corpusResourceIdsForCase(
        evaluationCase,
        resources
      );
      const answer = await answerRuntimeCase({
        evaluationCase,
        provider,
        pipeline,
        groundingPipeline,
        searchRepository,
        embeddingProvider,
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
      split: options.split,
      runId,
      runTimestamp,
      fixtureHash,
      splitHash,
      sourceState,
      frozenConfig,
      pipeline,
      cases: reviewCases,
    });
    if (recordsHoldoutAcceptance && splitHash) {
      if (recordsHoldoutV6Acceptance) {
        await updateHoldoutV6AcceptanceRun({
          splitHash,
          fixtureHash,
          candidateHead: sourceState.commit,
          candidateDiffHash: sourceState.diffHash,
          candidateTreeHash: sourceState.treeHash,
          candidateBehaviorHash: sourceState.behaviorHash,
          behaviorFilePaths: sourceState.behaviorFilePaths,
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
      } else if (recordsHoldoutV5Acceptance) {
        await updateHoldoutV5AcceptanceRun({
          splitHash,
          fixtureHash,
          candidateHead: sourceState.commit,
          candidateDiffHash: sourceState.diffHash,
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
      } else if (recordsHoldoutV4Acceptance) {
        await updateHoldoutV4AcceptanceRun({
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
      } else {
        await updateHoldoutV3AcceptanceRun({
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
    }
    return {
      runId,
      pipeline,
      fixtureHash,
      splitHash,
      frozenConfig,
      resourceScope,
      metadataScope,
      topology,
      report: { ...withRuntimeMetrics(report), pipeline },
      diagnostics,
      review,
      cleanup,
    };
  } catch (error) {
    if (recordsHoldoutAcceptance && splitHash) {
      if (recordsHoldoutV6Acceptance) {
        const writeRecord = acceptanceRecordStarted
          ? updateHoldoutV6AcceptanceRun
          : recordHoldoutV6AcceptanceRun;
        await writeRecord({
          splitHash,
          fixtureHash,
          candidateHead: sourceState.commit,
          candidateDiffHash: sourceState.diffHash,
          candidateTreeHash: sourceState.treeHash,
          candidateBehaviorHash: sourceState.behaviorHash,
          behaviorFilePaths: sourceState.behaviorFilePaths,
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
      } else if (recordsHoldoutV5Acceptance) {
        const writeRecord = acceptanceRecordStarted
          ? updateHoldoutV5AcceptanceRun
          : recordHoldoutV5AcceptanceRun;
        await writeRecord({
          splitHash,
          fixtureHash,
          candidateHead: sourceState.commit,
          candidateDiffHash: sourceState.diffHash,
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
      } else {
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
    pipeline: preflight.pipeline,
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
  const pipeline = resolveRuntimeGroundingPipelineKind(options.pipeline);
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
    pipeline,
    fixtureHash,
    splitHash,
    cases,
    resources,
    resourceScope,
    metadataScope,
    topology,
    frozenConfig: buildFrozenConfig(pipeline, options),
  };
}

export function resolveRuntimeGroundingPipelineKind(
  selected?: GroundingPipelineKind
): GroundedEvaluationPipeline {
  return resolveGroundingPipelineKind(selected ?? "legacy");
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
  if (selectedSplits.has(HOLDOUT_V6_SPLIT)) return allResources;
  if (selectedSplits.has(HOLDOUT_V5_SPLIT)) {
    const futureResourceIds = collectReferencedResourceIdsForCases(
      allCases.filter((item) => item.split === HOLDOUT_V6_SPLIT),
      allResources
    );
    return allResources.filter((item) => !futureResourceIds.has(item.id));
  }
  if (selectedSplits.has(HOLDOUT_V4_SPLIT)) {
    const futureResourceIds = collectReferencedResourceIdsForCases(
      allCases.filter(
        (item) => item.split === HOLDOUT_V5_SPLIT || item.split === HOLDOUT_V6_SPLIT
      ),
      allResources
    );
    return allResources.filter((item) => !futureResourceIds.has(item.id));
  }

  if (selectedSplits.has(HOLDOUT_V3_SPLIT)) {
    const futureResourceIds = collectReferencedResourceIdsForCases(
      allCases.filter(
        (item) =>
          item.split === HOLDOUT_V4_SPLIT ||
          item.split === HOLDOUT_V5_SPLIT ||
          item.split === HOLDOUT_V6_SPLIT
      ),
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
      ...(evaluationCase.corpusResourceIds ?? []),
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
  if (cases.some((item) => item.split === HOLDOUT_V5_SPLIT)) {
    return computeHoldoutV5SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
  }
  if (cases.some((item) => item.split === HOLDOUT_V6_SPLIT)) {
    return computeHoldoutV6SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
  }
  const resourceIds = collectReferencedResourceIdsForCases(
    cases,
    groundedEvaluationResources
  );

  const selectedResources = groundedEvaluationResources
    .filter((resource) => resourceIds.has(resource.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  const selectedCases = [...cases].sort((left, right) =>
    left.id.localeCompare(right.id)
  );

  return hashText(
    JSON.stringify({
      schemaVersion: "grounded-selected-split-hash-v1",
      splits: unique(selectedCases.map((item) => item.split)).sort(),
      cases: selectedCases.map((item) => ({
        id: item.id,
        split: item.split,
        messages: item.messages,
        subjectId: item.subjectId ?? null,
        topicId: item.topicId ?? null,
        shouldAnswer: item.shouldAnswer,
        corpusResourceIds: item.corpusResourceIds ?? [],
        expectedResourceIds: item.expectedResourceIds ?? [],
        expectedChunkIds: item.expectedChunkIds ?? [],
        setupResourceIds: item.setupResourceIds ?? [],
        requiredFacts: item.requiredFacts ?? [],
        optionalFacts: item.optionalFacts ?? [],
        forbiddenClaims: item.forbiddenClaims ?? [],
        expectedInsufficientReason: item.expectedInsufficientReason ?? null,
        manualReviewCriteria: item.manualReviewCriteria ?? null,
      })),
      resources: selectedResources.map((resource) => ({
        id: resource.id,
        title: resource.title,
        subjectId: resource.subjectId,
        topicId: resource.topicId ?? null,
        chunkId: resource.chunkId,
        chunkType: resource.chunkType,
        content: resource.content,
        questionNumber: resource.questionNumber ?? null,
        provenance: resource.provenance,
        usageRights: resource.usageRights,
      })),
    })
  );
}

async function enforceHoldoutGuard(
  options: RuntimeGroundedEvaluationOptions,
  fixtureHash: string,
  splitHash: string | null,
  cases: GroundedEvaluationCase[]
) {
  const includesHoldoutV3 = cases.some((item) => item.split === HOLDOUT_V3_SPLIT);
  const includesHoldoutV4 = cases.some((item) => item.split === HOLDOUT_V4_SPLIT);
  const includesHoldoutV5 = cases.some((item) => item.split === HOLDOUT_V5_SPLIT);
  const includesHoldoutV6 = cases.some((item) => item.split === HOLDOUT_V6_SPLIT);
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
  if (includesHoldoutV5) {
    if (!splitHash) {
      throw new Error("holdout_v5 split hash could not be computed.");
    }
    if (options.split !== HOLDOUT_V5_SPLIT && !options.allowConsumedHoldoutDiagnostic) {
      throw new Error("holdout_v5 must be executed explicitly, not through a mixed split.");
    }
    await assertHoldoutV5AcceptanceRunAllowed({
      confirmSplitHash: options.confirmHoldoutFixtureHash,
      computedSplitHash: splitHash,
      allowDiagnostic: options.allowConsumedHoldoutDiagnostic,
      caseIds: options.caseIds,
      maxCases: options.maxCases,
      reportDir: options.reportDir,
    });
    if (!options.allowConsumedHoldoutDiagnostic) {
      assertHoldoutV5FrozenRuntimeConfig(buildFrozenConfig());
    }
    return;
  }
  if (includesHoldoutV6) {
    if (!splitHash) {
      throw new Error("holdout_v6 split hash could not be computed.");
    }
    if (options.split !== HOLDOUT_V6_SPLIT && !options.allowConsumedHoldoutDiagnostic) {
      throw new Error("holdout_v6 must be executed explicitly, not through a mixed split.");
    }
    await assertHoldoutV6AcceptanceRunAllowed({
      confirmSplitHash: options.confirmHoldoutFixtureHash,
      computedSplitHash: splitHash,
      allowDiagnostic: options.allowConsumedHoldoutDiagnostic,
      caseIds: options.caseIds,
      maxCases: options.maxCases,
      reportDir: options.reportDir,
    });
    if (!options.allowConsumedHoldoutDiagnostic) {
      assertHoldoutV6FrozenRuntimeConfig(buildFrozenConfig());
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

function assertHoldoutV5FrozenRuntimeConfig(config: Record<string, unknown>) {
  const expected = HOLDOUT_V5_FROZEN_CONFIG;
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
      `holdout_v5 frozen config mismatch: ${mismatches
        .map(([key]) => key)
        .join(", ")}`
    );
  }
}

function assertHoldoutV6FrozenRuntimeConfig(config: Record<string, unknown>) {
  const expected = HOLDOUT_V6_FROZEN_CONFIG;
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
      `holdout_v6 frozen config mismatch: ${mismatches
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

function shouldRecordHoldoutV5Acceptance(
  options: RuntimeGroundedEvaluationOptions,
  cases: GroundedEvaluationCase[]
) {
  return (
    options.split === HOLDOUT_V5_SPLIT &&
    !options.allowConsumedHoldoutDiagnostic &&
    !options.caseIds?.length &&
    !options.maxCases &&
    cases.every((item) => item.split === HOLDOUT_V5_SPLIT)
  );
}

function shouldRecordHoldoutV6Acceptance(
  options: RuntimeGroundedEvaluationOptions,
  cases: GroundedEvaluationCase[]
) {
  return (
    options.split === HOLDOUT_V6_SPLIT &&
    !options.allowConsumedHoldoutDiagnostic &&
    !options.caseIds?.length &&
    !options.maxCases &&
    cases.every((item) => item.split === HOLDOUT_V6_SPLIT)
  );
}

async function answerRuntimeCase(input: {
  evaluationCase: GroundedEvaluationCase;
  provider: ChatModelProvider;
  pipeline: GroundedEvaluationPipeline;
  groundingPipeline: GroundingPipeline;
  searchRepository: ResourceSearchRepository;
  embeddingProvider: EmbeddingProvider;
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

  const outcome = await input.groundingPipeline.generate({
    context,
    provider: input.provider,
  });
  const diagnostic = await buildCaseDiagnostic(
    input.evaluationCase,
    input.caseCorpusResourceIds,
    input.searchRepository,
    input.embeddingProvider,
    input.pipeline
  );

  if (input.pipeline === "capability") {
    return buildCapabilityRuntimeAnswer({
      evaluationCase: input.evaluationCase,
      outcome: outcome as CapabilityGroundingOutcome,
      diagnostic,
    });
  }

  return buildLegacyRuntimeAnswer({
    evaluationCase: input.evaluationCase,
    outcome: outcome as GroundedGenerationOutcome,
    diagnostic,
  });
}

function buildLegacyRuntimeAnswer(input: {
  evaluationCase: GroundedEvaluationCase;
  outcome: GroundedGenerationOutcome;
  diagnostic: Awaited<ReturnType<typeof buildCaseDiagnostic>>;
}) {
  const { outcome } = input;

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
      diagnostic: { ...input.diagnostic, providerCalled: true },
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
        versions: reviewVersions("legacy"),
        provider: outcome.provider,
        model: outcome.model,
        repairUsed: outcome.repairAttempted,
        inputTokens: outcome.usage?.inputTokens,
        outputTokens: outcome.usage?.outputTokens,
        pipeline: "legacy",
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
      diagnostic: { ...input.diagnostic, providerCalled },
      review: buildReviewCase({
        evaluationCase: input.evaluationCase,
        actualClassification: "INSUFFICIENT_CONTEXT",
        generatedAnswerText: outcome.content,
        citations: [],
        citedExcerpts: [],
        insufficiencyReason: outcome.attempt.sufficiencyReason,
        versions: reviewVersions("legacy"),
        provider: configuredChatProviderName(),
        model: configuredChatModelName(),
        repairUsed: false,
        pipeline: "legacy",
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
      diagnostic: { ...input.diagnostic, providerCalled },
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
        versions: reviewVersions("legacy"),
        provider: configuredChatProviderName(),
        model: configuredChatModelName(),
        repairUsed: false,
        pipeline: "legacy",
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
    diagnostic: { ...input.diagnostic, providerCalled: false },
    review: buildReviewCase({
      evaluationCase: input.evaluationCase,
      actualClassification: "INSUFFICIENT_CONTEXT",
      generatedAnswerText: outcome.content,
      citations: [],
      citedExcerpts: [],
      insufficiencyReason: null,
      versions: reviewVersions("legacy"),
      provider: null,
      model: null,
      repairUsed: false,
      pipeline: "legacy",
    }),
  };
}

function buildCapabilityRuntimeAnswer(input: {
  evaluationCase: GroundedEvaluationCase;
  outcome: CapabilityGroundingOutcome;
  diagnostic: Awaited<ReturnType<typeof buildCaseDiagnostic>>;
}) {
  const { outcome } = input;

  if (outcome.kind === "COMPLETED") {
    const citations = mapCapabilityCitations({
      outcome,
      diagnostic: input.diagnostic,
    });
    const citedExcerpts = mapCapabilityCitedExcerpts({
      outcome,
      diagnostic: input.diagnostic,
    });
    const answerSegments = toEvaluationAnswerSegments(
      outcome.answerSegments ?? []
    );
    const groundingValidatorResults = toNarrowValidatorResults(outcome);
    const capabilityDiagnostics = redactCapabilityDiagnostics({
      diagnostics: outcome.diagnostics,
      finalClassification: "SUPPORTED",
    });
    return {
      answer: {
        answer: outcome.content,
        insufficientContext: false,
        citations,
        repairAttempted: false,
        regenerationUsed: false,
        successfulRepair: false,
        answerSegments,
        groundingValidatorResults,
        inputTokens: outcome.usage?.inputTokens,
        outputTokens: outcome.usage?.outputTokens,
        estimatedCostUsd: estimateCostUsd(
          outcome.usage?.inputTokens ?? 0,
          outcome.usage?.outputTokens ?? 0
        ),
      },
      diagnostic: {
        ...input.diagnostic,
        providerCalled: true,
        capabilityDiagnostics,
      },
      review: buildReviewCase({
        evaluationCase: input.evaluationCase,
        actualClassification: "SUPPORTED",
        generatedAnswerText: outcome.content,
        citations,
        citedExcerpts,
        answerSegments,
        groundingValidatorResults,
        regenerationUsed: false,
        originalUnsupportedSegmentIndices: [],
        insufficiencyReason: null,
        versions: reviewVersions("capability"),
        provider: outcome.provider,
        model: outcome.model,
        repairUsed: false,
        inputTokens: outcome.usage?.inputTokens,
        outputTokens: outcome.usage?.outputTokens,
        pipeline: "capability",
        capabilityDiagnostics,
      }),
    };
  }

  if (outcome.kind === "INSUFFICIENT_CONTEXT") {
    const capabilityDiagnostics = redactCapabilityDiagnostics({
      diagnostics: outcome.diagnostics,
      finalClassification: "INSUFFICIENT_CONTEXT",
    });
    const refusalReason =
      outcome.diagnostics.answerabilityDecision.refusalReason ??
      "MISSING_REQUIRED_EVIDENCE";
    return {
      answer: {
        answer: outcome.content,
        insufficientContext: true,
        citations: [],
        repairAttempted: false,
        regenerationUsed: false,
        successfulRepair: false,
        estimatedCostUsd: 0,
      },
      diagnostic: {
        ...input.diagnostic,
        providerCalled: false,
        sufficiencyReason: refusalReason,
        sufficiencyStatus: "INSUFFICIENT" as const,
        capabilityDiagnostics,
      },
      review: buildReviewCase({
        evaluationCase: input.evaluationCase,
        actualClassification: "INSUFFICIENT_CONTEXT",
        generatedAnswerText: outcome.content,
        citations: [],
        citedExcerpts: [],
        insufficiencyReason: refusalReason,
        versions: reviewVersions("capability"),
        provider: null,
        model: null,
        repairUsed: false,
        pipeline: "capability",
        capabilityDiagnostics,
      }),
    };
  }

  const providerCalled = outcome.diagnostics?.providerCalled === true;
  const capabilityDiagnostics = outcome.diagnostics
    ? redactCapabilityDiagnostics({
        diagnostics: outcome.diagnostics,
        finalClassification: "FAILED",
      })
    : undefined;
  return {
    answer: {
      answer: "",
      insufficientContext: false,
      citations: [],
      structuredOutputFailed: true,
      unsupportedSegmentFailed: false,
      repairAttempted: false,
      regenerationUsed: false,
      successfulRepair: false,
      estimatedCostUsd: 0,
    },
    diagnostic: {
      ...input.diagnostic,
      providerCalled,
      ...(capabilityDiagnostics ? { capabilityDiagnostics } : {}),
    },
    review: buildReviewCase({
      evaluationCase: input.evaluationCase,
      actualClassification: "FAILED",
      generatedAnswerText: "",
      citations: [],
      citedExcerpts: [],
      answerSegments: [],
      groundingValidatorResults: [],
      regenerationUsed: false,
      originalUnsupportedSegmentIndices: [],
      insufficiencyReason: outcome.failureCode,
      versions: reviewVersions("capability"),
      provider: null,
      model: null,
      repairUsed: false,
      pipeline: "capability",
      capabilityDiagnostics,
    }),
  };
}

/*
 * Capability citations are deliberately rebuilt from validated evidence units and
 * selected retrieval rows. This prevents a generated label from persisting an
 * unrelated retrieved chunk.
 */
function mapCapabilityCitations(input: {
  outcome: Extract<CapabilityGroundingOutcome, { kind: "COMPLETED" }>;
  diagnostic: Awaited<ReturnType<typeof buildCaseDiagnostic>>;
}) {
  return input.outcome.citations.flatMap((citation) => {
    const selected = input.diagnostic.selectedEvidence.find(
      (item) =>
        item.sourceLabel === citation.sourceLabel &&
        item.chunkId === citation.resourceChunkId
    );
    const units = input.outcome.diagnostics.validatedEvidenceUnits.filter(
      (unit) =>
        unit.sourceLabel === citation.sourceLabel &&
        unit.resourceChunkId === citation.resourceChunkId &&
        (citation.evidenceUnitIds.length === 0 ||
          citation.evidenceUnitIds.includes(unit.id))
    );

    if (!selected || units.length === 0) return [];
    return [
      {
        sourceLabel: citation.sourceLabel,
        resourceId: selected.resourceId,
        chunkId: selected.chunkId,
        subjectId: selected.subjectId ?? undefined,
        topicId: selected.topicId ?? undefined,
      },
    ];
  });
}

function mapCapabilityCitedExcerpts(input: {
  outcome: Extract<CapabilityGroundingOutcome, { kind: "COMPLETED" }>;
  diagnostic: Awaited<ReturnType<typeof buildCaseDiagnostic>>;
}) {
  const citations = mapCapabilityCitations(input);
  return citations.map((citation) => {
    const unitTexts = input.outcome.diagnostics.validatedEvidenceUnits
      .filter(
        (unit) =>
          unit.sourceLabel === citation.sourceLabel &&
          unit.resourceChunkId === citation.chunkId
      )
      .map((unit) => unit.quotedEvidence);
    return {
      ...citation,
      excerpt: unitTexts.join("\n"),
      excerptTruncated: false,
    };
  });
}

function toNarrowValidatorResults(
  outcome: Extract<CapabilityGroundingOutcome, { kind: "COMPLETED" }>
) {
  const validation = outcome.diagnostics.narrowValidatorResult;
  if (!validation) return [];
  if (validation.supported && validation.response) {
    return validation.response.answerSegments.map((segment, index) => ({
      index,
      text: segment.text,
      sourceLabels: segment.sourceLabels,
      supported: true,
      reason: "NARROW_VALIDATION_PASSED",
      unsupportedTerms: [],
      validatorVersion: "capability-narrow-grounding-validator-v1",
    }));
  }

  return validation.errors.map((error, index) => ({
    index: error.segmentIndex ?? index,
    text: "",
    sourceLabels: [],
    supported: false,
    reason: error.code,
    unsupportedTerms: [],
    unsupportedClaim: error.message,
    validatorVersion: "capability-narrow-grounding-validator-v1",
  }));
}

function toEvaluationAnswerSegments(
  segments: Extract<CapabilityGroundingOutcome, { kind: "COMPLETED" }>["answerSegments"]
) {
  return segments.map((segment, index) => ({
    index,
    text: segment.text,
    sourceLabels: segment.sourceLabels,
  }));
}

function redactCapabilityDiagnostics(input: {
  diagnostics: Partial<CapabilityPipelineDiagnostics>;
  finalClassification: GroundedEvaluationClassification;
}): GroundedEvaluationCapabilityDiagnostics {
  const diagnostics = input.diagnostics;
  return {
    pipelineVersion: diagnostics.pipelineVersion ?? CAPABILITY_GROUNDING_VERSION,
    promptVersion:
      diagnostics.promptVersion ?? CAPABILITY_GROUNDED_PROMPT_VERSION,
    retrievalQuery: boundedDiagnosticText(diagnostics.retrievalQuery ?? ""),
    requestRequirements: redactDiagnosticValue(
      diagnostics.requestRequirements ?? null
    ),
    evidenceCapabilities: Array.isArray(diagnostics.evidenceCapabilities)
      ? diagnostics.evidenceCapabilities.map((capability) =>
          redactDiagnosticValue(capability)
        )
      : [],
    detectedConflicts: Array.isArray(diagnostics.detectedConflicts)
      ? diagnostics.detectedConflicts.map((conflict) =>
          redactDiagnosticValue(conflict)
        )
      : [],
    answerabilityDecision: redactDiagnosticValue(
      diagnostics.answerabilityDecision ?? null
    ),
    validatedEvidenceUnits: Array.isArray(diagnostics.validatedEvidenceUnits)
      ? diagnostics.validatedEvidenceUnits.map((unit) =>
          redactDiagnosticValue(unit)
        )
      : [],
    taskOutputMode: diagnostics.taskOutputMode,
    providerCalled: diagnostics.providerCalled === true,
    generationResult: summarizeGenerationOutput(diagnostics.generationOutput),
    structuredOutput:
      diagnostics.structuredOutput === undefined
        ? undefined
        : redactDiagnosticValue(diagnostics.structuredOutput),
    structuredValidationResult:
      diagnostics.structuredValidationResult === undefined
        ? undefined
        : redactDiagnosticValue(diagnostics.structuredValidationResult),
    narrowValidatorResult: diagnostics.narrowValidatorResult
      ? redactDiagnosticValue({
          supported: diagnostics.narrowValidatorResult.supported,
          errors: diagnostics.narrowValidatorResult.errors,
          answerSegmentCount:
            diagnostics.narrowValidatorResult.response?.answerSegments.length ?? 0,
          citations: diagnostics.narrowValidatorResult.response?.citations ?? [],
        })
      : null,
    repairResult: diagnostics.repairResult ?? {
      attempted: false,
      successful: false,
    },
    finalClassification: input.finalClassification,
  };
}

function summarizeGenerationOutput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { present: value !== undefined && value !== null };
  }
  const record = value as Record<string, unknown>;
  return {
    present: true,
    insufficientContext:
      typeof record.insufficientContext === "boolean"
        ? record.insufficientContext
        : undefined,
    answerSegmentCount: Array.isArray(record.answerSegments)
      ? record.answerSegments.length
      : undefined,
  };
}

function redactDiagnosticValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return boundedDiagnosticText(value);
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 64).map((item) => redactDiagnosticValue(item, depth + 1));
  }
  if (typeof value !== "object") return null;
  if (depth > 8) return "[redacted-depth-limit]";

  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (isSensitiveDiagnosticKey(key)) {
      output[key] = "[redacted]";
      continue;
    }
    output[key] = redactDiagnosticValue(child, depth + 1);
  }
  return output;
}

function boundedDiagnosticText(value: string) {
  const redacted = value.replace(
    /\b(?:sk|pk|sb_secret|eyJ)[A-Za-z0-9._-]{12,}\b/g,
    "[redacted-secret-like-value]"
  );
  return redacted.length > 700 ? `${redacted.slice(0, 680)}\n[truncated]` : redacted;
}

function isSensitiveDiagnosticKey(key: string) {
  return /api.?key|token|cookie|authorization|password|secret|systemPrompt|developerPrompt|raw/i.test(
    key
  );
}

async function buildCaseDiagnostic(
  evaluationCase: GroundedEvaluationCase,
  caseCorpusResourceIds: string[],
  searchRepository: ResourceSearchRepository,
  embeddingProvider: EmbeddingProvider,
  pipeline: GroundedEvaluationPipeline
) {
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
    pipeline,
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
      subjectId: item.chunk.subjectId,
      topicId: item.chunk.topicId,
      retrievalRank: item.retrievalRank,
      exactSignals: item.chunk.exactSignals.slice(0, 10),
      keywordScore: item.chunk.keywordScore,
      vectorDistance: item.chunk.vectorDistance,
      fusionScore: item.chunk.fusionScore,
    })),
    retrievalDiagnostics: {
      fusedTopN: rankedDiagnosticRows(candidates),
      keywordTopN: rankedDiagnosticRows(
        candidates
          .filter((item) => item.keywordRank !== null)
          .sort((left, right) => (left.keywordRank ?? 9999) - (right.keywordRank ?? 9999))
      ),
      vectorTopN: rankedDiagnosticRows(
        candidates
          .filter((item) => item.vectorRank !== null)
          .sort((left, right) => (left.vectorRank ?? 9999) - (right.vectorRank ?? 9999))
      ),
      selectedButNotCited: [],
      expectedSourceRank: expectedSourceRank(evaluationCase, candidates),
    },
  };
}

function rankedDiagnosticRows(chunks: Awaited<ReturnType<PostgresResourceSearchRepository["hybridSearch"]>>) {
  return chunks.slice(0, 20).map((chunk, index) => ({
    rank: index + 1,
    resourceId: chunk.resourceId,
    chunkId: chunk.id,
    keywordRank: chunk.keywordRank,
    vectorRank: chunk.vectorRank,
    keywordScore: chunk.keywordScore,
    vectorDistance: chunk.vectorDistance,
    fusionScore: chunk.fusionScore,
    exactSignals: chunk.exactSignals.slice(0, 10),
  }));
}

function expectedSourceRank(
  evaluationCase: GroundedEvaluationCase,
  chunks: Awaited<ReturnType<PostgresResourceSearchRepository["hybridSearch"]>>
) {
  const expectedChunkIds = new Set(evaluationCase.expectedChunkIds ?? []);
  const expectedResourceIds = new Set(evaluationCase.expectedResourceIds ?? []);
  return chunks
    .map((chunk, index) => ({ chunk, index }))
    .filter(
      ({ chunk }) =>
        expectedChunkIds.has(chunk.id) || expectedResourceIds.has(chunk.resourceId)
    )
    .map(({ chunk, index }) => ({
      rank: index + 1,
      resourceId: chunk.resourceId,
      chunkId: chunk.id,
      keywordRank: chunk.keywordRank,
      vectorRank: chunk.vectorRank,
      fusionScore: chunk.fusionScore,
    }));
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
  const citationDelete = await prisma.aiMessageCitation.deleteMany({
    where: {
      OR: [
        { messageId: { startsWith: "runtime-assistant-" } },
        {
          groundingAttempt: {
            generationRequestId: { startsWith: "runtime-request-" },
          },
        },
      ],
    },
  });
  const attemptDelete = await prisma.aiGroundingAttempt.deleteMany({
    where: { generationRequestId: { startsWith: "runtime-request-" } },
  });
  const requestDelete = await prisma.aiGenerationRequest.deleteMany({
    where: { id: { startsWith: "runtime-request-" } },
  });
  const messageDelete = await prisma.aiChatMessage.deleteMany({
    where: { id: { startsWith: "runtime-" } },
  });
  const chatDelete = await prisma.aiChat.deleteMany({
    where: { id: { startsWith: "runtime-chat-" } },
  });
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
    citationDelete: citationDelete.count,
    attemptDelete: attemptDelete.count,
    messageDelete: messageDelete.count,
    requestDelete: requestDelete.count,
    chatDelete: chatDelete.count,
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
      chats: await prisma.aiChat.count({
        where: { id: { startsWith: "runtime-chat-" } },
      }),
      messages: await prisma.aiChatMessage.count({
        where: { id: { startsWith: "runtime-" } },
      }),
      requests: await prisma.aiGenerationRequest.count({
        where: { id: { startsWith: "runtime-request-" } },
      }),
      attempts: await prisma.aiGroundingAttempt.count({
        where: { generationRequestId: { startsWith: "runtime-request-" } },
      }),
      citations: await prisma.aiMessageCitation.count({
        where: {
          OR: [
            { messageId: { startsWith: "runtime-assistant-" } },
            {
              groundingAttempt: {
                generationRequestId: { startsWith: "runtime-request-" },
              },
            },
          ],
        },
      }),
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

function buildFrozenConfig(
  pipeline: GroundedEvaluationPipeline = "legacy",
  options: Pick<
    RuntimeGroundedEvaluationOptions,
    | "providerLabel"
    | "providerModelLabel"
    | "embeddingProviderLabel"
    | "embeddingModelLabel"
    | "embeddingDimensionsLabel"
  > = {}
) {
  return {
    pipeline,
    promptVersion: GROUNDED_PROMPT_VERSION,
    capabilityPromptVersion: CAPABILITY_GROUNDED_PROMPT_VERSION,
    groundingVersion: GROUNDING_VERSION,
    capabilityGroundingVersion: CAPABILITY_GROUNDING_VERSION,
    sufficiencyPolicyVersion: SUFFICIENCY_POLICY_VERSION,
    groundingValidatorVersion: GROUNDING_VALIDATOR_VERSION,
    featureFlagEnabledForOrdinaryUsers: isGroundedChatEnabled(),
    chatProvider: options.providerLabel ?? process.env.AI_CHAT_PROVIDER ?? "openai",
    chatModel: options.providerModelLabel ?? process.env.AI_CHAT_MODEL ?? "gpt-4o-mini",
    embeddingProvider:
      options.embeddingProviderLabel ?? process.env.AI_EMBEDDING_PROVIDER ?? "openai",
    embeddingModel:
      options.embeddingModelLabel ??
      process.env.AI_EMBEDDING_MODEL ??
      "text-embedding-3-small",
    embeddingDimensions:
      options.embeddingDimensionsLabel ??
      Number(process.env.AI_EMBEDDING_DIMENSIONS ?? 1536),
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
  };
}

function reviewVersions(pipeline: GroundedEvaluationPipeline) {
  if (pipeline === "capability") {
    return {
      prompt: CAPABILITY_GROUNDED_PROMPT_VERSION,
      grounding: CAPABILITY_GROUNDING_VERSION,
      sufficiency: SUFFICIENCY_POLICY_VERSION,
    };
  }

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

async function getSourceState(
  pipeline: GroundedEvaluationPipeline
): Promise<GroundedEvaluationReportSourceState> {
  const commit = await readGitOutput(["rev-parse", "HEAD"]);
  const treeHash = await readGitOutput(["rev-parse", "HEAD^{tree}"]);
  const diff = await readGitOutput(["diff", "--binary", "HEAD", "--"]);
  const untrackedFiles = await readUntrackedFiles();
  const behaviorFilePaths = behaviorFilePathsForPipeline(pipeline);
  const behaviorHash = await hashBehaviorFiles(behaviorFilePaths);
  return {
    commit,
    diffHash: await hashWorkingTreeDiff(diff ?? "", untrackedFiles),
    treeHash,
    behaviorHash,
    behaviorHashAlgorithm: STAGE41_CAPABILITY_BEHAVIOR_HASH_ALGORITHM,
    behaviorFilePaths,
    dirty: Boolean(diff) || untrackedFiles.length > 0,
  };
}

function behaviorFilePathsForPipeline(pipeline: GroundedEvaluationPipeline) {
  return pipeline === "capability"
    ? STAGE41_CAPABILITY_BEHAVIOR_FILE_PATHS
    : HOLDOUT_V6_BEHAVIOR_FILE_PATHS;
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

async function readUntrackedFiles() {
  const output = await readGitOutput(["ls-files", "--others", "--exclude-standard"]);
  return (output ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

async function hashWorkingTreeDiff(diff: string, untrackedFiles: string[]) {
  const hash = createHash("sha256");
  hash.update("git diff --binary HEAD --");
  hash.update("\0");
  hash.update(diff);
  hash.update("\0");
  hash.update("untracked files");
  hash.update("\0");
  for (const filePath of untrackedFiles) {
    hash.update(filePath);
    hash.update("\0");
    hash.update(await fs.readFile(path.join(process.cwd(), filePath)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function hashFixtureFile() {
  const fixturePath = path.join(process.cwd(), FIXTURE_PATH);
  return hashText(await fs.readFile(fixturePath, "utf8"));
}

async function hashBehaviorFiles(filePaths: readonly string[]) {
  const hash = createHash("sha256");
  for (const filePath of [...filePaths].sort((a, b) => a.localeCompare(b))) {
    hash.update(filePath);
    hash.update("\0");
    hash.update(await fs.readFile(path.join(process.cwd(), filePath), "utf8"));
    hash.update("\0");
  }
  return hash.digest("hex");
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
