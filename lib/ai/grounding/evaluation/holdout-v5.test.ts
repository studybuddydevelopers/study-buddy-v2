import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_REVIEW_REPORT_DIR,
  buildReviewCase,
  buildReviewReport,
} from "./review-report";
import {
  HOLDOUT_V5_ACCEPTANCE_GATES,
  HOLDOUT_V5_FIXTURE_SCHEMA_VERSION,
  HOLDOUT_V5_FROZEN_CONFIG,
  HOLDOUT_V5_SPLIT,
  analyzeHoldoutV5Contamination,
  assertHoldoutV5AcceptanceRunAllowed,
  computeHoldoutV5SplitHash,
  holdoutV5RunRecordPath,
  recordHoldoutV5AcceptanceRun,
  summarizeHoldoutV5Split,
  validateHoldoutV5FixtureReferences,
} from "./holdout-v5";
import {
  groundedEvaluationCases,
  groundedEvaluationResources,
} from "./fixtures";
import {
  buildEvaluationTopologyReport,
  resolveEvaluationMetadataForCases,
} from "./metadata-scope";
import {
  buildEvaluationResourceScope,
  resolveEvaluationResourcesForSplit,
} from "./resource-scope";
import { runRuntimeGroundedEvaluationPreflight } from "./runtime-runner";

const HOLDOUT_V5_HASH =
  "912835e47031d26b7e05a06cc6c5e43dc90b3a9ade8cb153964fb036aee59054";

describe("Stage 4 holdout_v5 preparation", () => {
  it("defines a fresh balanced 32-case split", () => {
    const summary = summarizeHoldoutV5Split({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });

    expect(summary.fixtureSchemaVersion).toBe(HOLDOUT_V5_FIXTURE_SCHEMA_VERSION);
    expect(summary.caseCount).toBe(32);
    expect(summary.supportedCount).toBe(16);
    expect(summary.refusalCount).toBe(16);
    expect(summary.resourceCount).toBe(29);
    expect(summary.splitHash).toBe(HOLDOUT_V5_HASH);
    expect(summary.sourceHead).toBe(
      "71ac500775f741f30c9d9b87b4d83b39f2347a0b"
    );
  });

  it("keeps ids unique and separate from disclosed splits", () => {
    const ids = groundedEvaluationCases.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    const holdoutCases = holdoutV5Cases();
    expect(holdoutCases.every((item) => item.id.startsWith("holdout-v5-"))).toBe(
      true
    );
    expect(
      groundedEvaluationCases
        .filter((item) => item.split !== HOLDOUT_V5_SPLIT)
        .some((item) => item.id.startsWith("holdout-v5-"))
    ).toBe(false);
  });

  it("validates holdout_v5 resource, chunk, and corpus references", () => {
    expect(
      validateHoldoutV5FixtureReferences({
        cases: groundedEvaluationCases,
        resources: groundedEvaluationResources,
      })
    ).toEqual([]);
    expect(holdoutV5Cases().every((item) => Array.isArray(item.corpusResourceIds))).toBe(
      true
    );
  });

  it("resolves exact holdout_v5 resource scope without extra resources", () => {
    const holdoutCases = holdoutV5Cases();
    const resolved = resolveEvaluationResourcesForSplit(
      holdoutCases,
      groundedEvaluationResources
    );
    const scope = buildEvaluationResourceScope({
      split: HOLDOUT_V5_SPLIT,
      cases: holdoutCases,
      allResources: groundedEvaluationResources,
      resolvedResources: resolved,
    });

    expect(scope.selectedCaseCount).toBe(32);
    expect(scope.globalResourceCount).toBe(169);
    expect(scope.referencedResourceCount).toBe(29);
    expect(scope.seededResourceCount).toBe(29);
    expect(scope.unreferencedResourceCount).toBe(140);
    expect(scope.referencedChunkCount).toBe(29);
    expect(scope.embeddedChunkCount).toBe(29);
    expect(scope.extraResourceCount).toBe(0);
    expect(scope.corpusSummary.maxResourcesPerCase).toBe(2);
    expect(scope.corpusSummary.averageResourcesPerCase).toBe(0.96875);
    expect(scope.corpusSummary.contaminatedCases).toBe(0);
  });

  it("validates topology and metadata-only topics for all holdout_v5 cases", () => {
    const holdoutCases = holdoutV5Cases();
    const resolved = resolveEvaluationResourcesForSplit(
      holdoutCases,
      groundedEvaluationResources
    );
    const metadata = resolveEvaluationMetadataForCases(holdoutCases, resolved);
    const topology = buildEvaluationTopologyReport({
      cases: holdoutCases,
      metadataScope: metadata,
    });

    expect(topology.casesChecked).toBe(32);
    expect(topology.validRetrievalFilters).toBe(32);
    expect(topology.invalidRetrievalFilters).toBe(0);
    expect(metadata.metadataOnlySubjectIds).toEqual([]);
    expect(metadata.metadataOnlyTopicIds).toEqual([
      "eval-topic-v5-cell-transport",
      "eval-topic-v5-exam-admin",
    ]);
  });

  it("keeps zero-resource topics structurally valid without broadening provider scope", () => {
    const zeroResourceCases = holdoutV5Cases().filter(
      (item) => item.corpusResourceIds?.length === 0
    );
    const resolved = resolveEvaluationResourcesForSplit(
      zeroResourceCases,
      groundedEvaluationResources
    );
    const metadata = resolveEvaluationMetadataForCases(zeroResourceCases, resolved);
    const topology = buildEvaluationTopologyReport({
      cases: zeroResourceCases,
      metadataScope: metadata,
    });

    expect(zeroResourceCases.map((item) => item.id)).toEqual([
      "holdout-v5-refusal-osmosis-no-evidence",
      "holdout-v5-refusal-user-bypass-latest-deadline",
      "holdout-v5-refusal-current-online-science-topic",
    ]);
    expect(resolved).toHaveLength(0);
    expect(topology.invalidRetrievalFilters).toBe(0);
    expect(metadata.metadataOnlyTopicIds).toEqual([
      "eval-topic-v5-cell-transport",
      "eval-topic-v5-energy-resources",
      "eval-topic-v5-exam-admin",
    ]);
  });

  it("detects genuinely mismatched subject/topic ownership", () => {
    const mismatched = {
      ...holdoutV5Cases()[0],
      id: "holdout-v5-mismatched-topic",
      subjectId: "eval-subject-physics",
      topicId: "eval-topic-v5-number-properties",
    };
    const metadata = resolveEvaluationMetadataForCases([mismatched], []);
    const topology = buildEvaluationTopologyReport({
      cases: [mismatched],
      metadataScope: metadata,
    });

    expect(topology.invalidRetrievalFilters).toBe(0);
    expect(() =>
      resolveEvaluationMetadataForCases([holdoutV5Cases()[0], mismatched], [])
    ).toThrow("declared under both");
  });

  it("finds no exact or near contamination against disclosed splits and tests", () => {
    const findings = analyzeHoldoutV5Contamination({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
      testCorpus: readApplicationTestCorpus(),
    });

    expect(findings).toEqual([]);
  });

  it("computes a deterministic v5 hash that changes with case or corpus mutation", () => {
    const currentHash = computeHoldoutV5SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
    const repeatedHash = computeHoldoutV5SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
    const mutatedCases = groundedEvaluationCases.map((item) =>
      item.id === "holdout-v5-supported-prime-definition"
        ? { ...item, corpusResourceIds: [] }
        : item
    );

    expect(currentHash).toBe(HOLDOUT_V5_HASH);
    expect(repeatedHash).toBe(HOLDOUT_V5_HASH);
    expect(
      computeHoldoutV5SplitHash({
        cases: mutatedCases,
        resources: groundedEvaluationResources,
      })
    ).not.toBe(HOLDOUT_V5_HASH);
  });

  it("dry-runs holdout_v5 without provider calls, DB mutations, or marker consumption", async () => {
    const reportDir = await mkdtemp(path.join(os.tmpdir(), "holdout-v5-dry-run-"));
    const report = await runRuntimeGroundedEvaluationPreflight({
      split: HOLDOUT_V5_SPLIT,
      confirmHoldoutFixtureHash: HOLDOUT_V5_HASH,
      allowConsumedHoldoutDiagnostic: true,
      reportDir,
    });

    expect(report.dryRun).toBe(true);
    expect(report.providerCalls).toBe(0);
    expect(report.dbMutations).toBe(0);
    expect(report.splitHash).toBe(HOLDOUT_V5_HASH);
    expect(report.resourceScope.seededResourceCount).toBe(29);
    expect(report.resourceScope.extraResourceCount).toBe(0);
    expect(report.topology.casesChecked).toBe(32);
    expect(report.topology.validRetrievalFilters).toBe(32);
    expect(
      await fileExists(holdoutV5RunRecordPath({ splitHash: HOLDOUT_V5_HASH, reportDir }))
    ).toBe(false);

    await rm(reportDir, { recursive: true, force: true });
  });

  it("requires an explicit one-shot marker and permanently blocks after a record exists", async () => {
    const reportDir = await mkdtemp(path.join(os.tmpdir(), "holdout-v5-guard-"));

    await expect(
      assertHoldoutV5AcceptanceRunAllowed({
        confirmSplitHash: "wrong",
        computedSplitHash: HOLDOUT_V5_HASH,
        reportDir,
      })
    ).rejects.toThrow("matching split hash");

    await expect(
      assertHoldoutV5AcceptanceRunAllowed({
        confirmSplitHash: HOLDOUT_V5_HASH,
        computedSplitHash: HOLDOUT_V5_HASH,
        reportDir,
        maxCases: 1,
      })
    ).rejects.toThrow("complete split");

    const recordPath = await recordHoldoutV5AcceptanceRun({
      splitHash: HOLDOUT_V5_HASH,
      fixtureHash: "fixture-hash",
      candidateHead: "candidate-head",
      candidateDiffHash: "candidate-diff-hash",
      reportDir,
      runId: "holdout-v5-test-run",
      runTimestamp: "2026-08-13T00:00:00.000Z",
      status: "FAILED",
      errorClass: "RetrievalError",
      failurePhase: "RETRIEVAL_FAILURE",
      modelEvaluationReached: false,
      chatGenerationReached: false,
      metricsProduced: false,
    });
    expect(JSON.parse(await readFile(recordPath, "utf8"))).toMatchObject({
      split: HOLDOUT_V5_SPLIT,
      fixtureHash: "fixture-hash",
      candidateHead: "candidate-head",
      candidateDiffHash: "candidate-diff-hash",
      frozenConfig: HOLDOUT_V5_FROZEN_CONFIG,
      status: "FAILED",
      failurePhase: "RETRIEVAL_FAILURE",
    });

    await expect(
      assertHoldoutV5AcceptanceRunAllowed({
        confirmSplitHash: HOLDOUT_V5_HASH,
        computedSplitHash: HOLDOUT_V5_HASH,
        reportDir,
      })
    ).rejects.toThrow("already has an acceptance-run record");

    await expect(
      assertHoldoutV5AcceptanceRunAllowed({
        confirmSplitHash: HOLDOUT_V5_HASH,
        computedSplitHash: HOLDOUT_V5_HASH,
        reportDir,
        allowDiagnostic: true,
        maxCases: 1,
      })
    ).resolves.toBeUndefined();

    await rm(reportDir, { recursive: true, force: true });
  });

  it("retains the safe reporting metadata required for future answer review", () => {
    const reviewCase = buildReviewCase({
      evaluationCase: {
        id: "holdout-v5-review-retention",
        split: HOLDOUT_V5_SPLIT,
        messages: [{ role: "USER", content: "Synthetic review retention check." }],
        shouldAnswer: true,
        expectedResourceIds: ["resource-1"],
        requiredFacts: ["retained"],
      },
      actualClassification: "SUPPORTED",
      generatedAnswerText: "The answer text is retained. [SOURCE_1]",
      citations: [{ sourceLabel: "SOURCE_1", resourceId: "resource-1" }],
      citedExcerpts: [
        {
          sourceLabel: "SOURCE_1",
          resourceId: "resource-1",
          chunkId: "chunk-1",
          excerpt: "Bounded evidence excerpt.",
          excerptTruncated: false,
        },
      ],
      answerSegments: [
        {
          index: 0,
          text: "The answer text is retained.",
          sourceLabels: ["SOURCE_1"],
        },
      ],
      groundingValidatorResults: [
        {
          index: 0,
          text: "The answer text is retained.",
          sourceLabels: ["SOURCE_1"],
          supported: true,
          reason: "SUPPORTED",
          unsupportedTerms: [],
          validatorVersion: HOLDOUT_V5_FROZEN_CONFIG.validator,
        },
      ],
      versions: {
        prompt: HOLDOUT_V5_FROZEN_CONFIG.prompt,
        grounding: HOLDOUT_V5_FROZEN_CONFIG.grounding,
        sufficiency: HOLDOUT_V5_FROZEN_CONFIG.sufficiency,
      },
      repairUsed: true,
      inputTokens: 10,
      outputTokens: 6,
    });
    const report = buildReviewReport({
      runId: "holdout-v5-retention",
      runTimestamp: "2026-08-13T00:00:00.000Z",
      fixtureHash: "fixture-hash",
      splitHash: HOLDOUT_V5_HASH,
      sourceState: { commit: "candidate-head", diffHash: "candidate-diff", dirty: true },
      frozenConfig: HOLDOUT_V5_FROZEN_CONFIG,
      cases: [reviewCase],
    });

    expect(report.split).toBe(HOLDOUT_V5_SPLIT);
    expect(report.splitHash).toBe(HOLDOUT_V5_HASH);
    expect(report.sourceState.diffHash).toBe("candidate-diff");
    expect(report.frozenConfig).toMatchObject(HOLDOUT_V5_FROZEN_CONFIG);
    expect(report.cases[0].generatedAnswerText).toContain("retained");
    expect(report.cases[0].answerSegments[0].sourceLabels).toEqual(["SOURCE_1"]);
    expect(report.cases[0].citedExcerpts[0].excerpt).toContain("Bounded");
    expect(report.cases[0].detectedRequiredFacts).toEqual(["retained"]);
    expect(report.reportHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps holdout_v5 reports and run records ignored by git", async () => {
    const reportDir = await mkdtemp(path.join(os.tmpdir(), "holdout-v5-ignore-"));
    const ignoredPath = `${DEFAULT_REVIEW_REPORT_DIR}/holdout-v5-acceptance-sample.json`;
    await writeFile(path.join(reportDir, "placeholder"), "x", "utf8");

    expect(
      execFileSync("git", ["check-ignore", ignoredPath], {
        cwd: process.cwd(),
        encoding: "utf8",
      })
    ).toContain(DEFAULT_REVIEW_REPORT_DIR);

    await rm(reportDir, { recursive: true, force: true });
  });

  it("freezes holdout_v5 acceptance gates and recommendation ceiling before execution", () => {
    expect(HOLDOUT_V5_ACCEPTANCE_GATES.safety.unsupportedFactualAnswers).toBe(0);
    expect(HOLDOUT_V5_ACCEPTANCE_GATES.safety.unsupportedAcceptedSegments).toBe(0);
    expect(HOLDOUT_V5_ACCEPTANCE_GATES.safety.invalidCitationRate).toBe(0);
    expect(HOLDOUT_V5_ACCEPTANCE_GATES.safety.citationValidity).toBe(1);
    expect(HOLDOUT_V5_ACCEPTANCE_GATES.safety.conflictFalseNegatives).toBe(0);
    expect(HOLDOUT_V5_ACCEPTANCE_GATES.safety.missingInputFalsePositives).toBe(0);
    expect(HOLDOUT_V5_ACCEPTANCE_GATES.answerability.answerabilityAccuracyMin).toBe(
      0.95
    );
    expect(HOLDOUT_V5_ACCEPTANCE_GATES.answerability.correctRefusalRate).toBe(1);
    expect(
      HOLDOUT_V5_ACCEPTANCE_GATES.retrievalUsefulness.expectedSourceRecallMin
    ).toBe(0.9);
    expect(
      HOLDOUT_V5_ACCEPTANCE_GATES.retrievalUsefulness.averageRequiredFactCoverageMin
    ).toBe(0.85);
    expect(HOLDOUT_V5_ACCEPTANCE_GATES.recommendationRules.allSyntheticGatesPass).toBe(
      "ENABLE_FOR_INTERNAL_TEST_USERS_MAX"
    );
    expect(HOLDOUT_V5_ACCEPTANCE_GATES.recommendationRules.productionFromSingleHoldout).toBe(
      "PROHIBITED"
    );
  });
});

function holdoutV5Cases() {
  return groundedEvaluationCases.filter((item) => item.split === HOLDOUT_V5_SPLIT);
}

async function fileExists(filePath: string) {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function readApplicationTestCorpus() {
  const files = execFileSync("rg", ["--files", "-g", "*.test.ts", "-g", "*.test.tsx"], {
    cwd: process.cwd(),
    encoding: "utf8",
  })
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !item.endsWith("evaluation/holdout-v5.test.ts"));

  return files
    .map((filePath) => readFileSync(path.join(process.cwd(), filePath), "utf8"))
    .join("\n");
}
