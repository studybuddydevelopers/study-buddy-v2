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
  HOLDOUT_V4_ACCEPTANCE_GATES,
  HOLDOUT_V4_FIXTURE_SCHEMA_VERSION,
  HOLDOUT_V4_FROZEN_CONFIG,
  HOLDOUT_V4_SPLIT,
  analyzeHoldoutV4Contamination,
  assertHoldoutV4AcceptanceRunAllowed,
  computeHoldoutV4SplitHash,
  holdoutV4RunRecordPath,
  recordHoldoutV4AcceptanceRun,
  summarizeHoldoutV4Split,
  validateHoldoutV4FixtureReferences,
} from "./holdout-v4";
import {
  assertHoldoutV3AcceptanceRunAllowed,
  computeHoldoutV3SplitHash,
  recordHoldoutV3AcceptanceRun,
} from "./holdout-v3";
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

const HOLDOUT_V4_HASH =
  "7158403b7a60d6e6037a4ead7eae751d80e57b446d9b72ea27ef21df9f9cf5cf";

describe("Stage 4 holdout_v4 preparation", () => {
  it("defines a balanced fresh 28-case split", () => {
    const summary = summarizeHoldoutV4Split({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });

    expect(summary.fixtureSchemaVersion).toBe(HOLDOUT_V4_FIXTURE_SCHEMA_VERSION);
    expect(summary.caseCount).toBe(28);
    expect(summary.supportedCount).toBe(14);
    expect(summary.refusalCount).toBe(14);
    expect(summary.resourceCount).toBe(26);
    expect(summary.splitHash).toBe(HOLDOUT_V4_HASH);
  });

  it("keeps ids unique and separate from older splits", () => {
    const ids = groundedEvaluationCases.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    const holdoutCases = holdoutV4Cases();
    expect(holdoutCases.every((item) => item.id.startsWith("holdout-v4-"))).toBe(
      true
    );
    expect(
      groundedEvaluationCases
        .filter((item) => item.split !== HOLDOUT_V4_SPLIT)
        .some((item) => item.id.startsWith("holdout-v4-"))
    ).toBe(false);
  });

  it("validates holdout_v4 resource and chunk references", () => {
    expect(
      validateHoldoutV4FixtureReferences({
        cases: groundedEvaluationCases,
        resources: groundedEvaluationResources,
      })
    ).toEqual([]);
  });

  it("resolves exact holdout_v4 resource scope without extra resources", () => {
    const holdoutCases = holdoutV4Cases();
    const holdoutV4ResourceUniverse = resourcesThroughHoldoutV4();
    const resolved = resolveEvaluationResourcesForSplit(
      holdoutCases,
      holdoutV4ResourceUniverse
    );
    const scope = buildEvaluationResourceScope({
      split: HOLDOUT_V4_SPLIT,
      cases: holdoutCases,
      allResources: holdoutV4ResourceUniverse,
      resolvedResources: resolved,
    });

    expect(holdoutV4ResourceUniverse).toHaveLength(99);
    expect(scope.selectedCaseCount).toBe(28);
    expect(scope.referencedResourceCount).toBe(26);
    expect(scope.seededResourceCount).toBe(26);
    expect(scope.unreferencedResourceCount).toBe(73);
    expect(scope.referencedChunkCount).toBe(26);
    expect(scope.embeddedChunkCount).toBe(26);
    expect(scope.extraResourceCount).toBe(0);
    expect(resolved.every((item) => item.id.includes("holdout-v4"))).toBe(true);
  });

  it("validates topology for all holdout_v4 cases", () => {
    const holdoutCases = holdoutV4Cases();
    const resolved = resolveEvaluationResourcesForSplit(
      holdoutCases,
      groundedEvaluationResources
    );
    const metadata = resolveEvaluationMetadataForCases(holdoutCases, resolved);
    const topology = buildEvaluationTopologyReport({
      cases: holdoutCases,
      metadataScope: metadata,
    });

    expect(topology.casesChecked).toBe(28);
    expect(topology.validRetrievalFilters).toBe(28);
    expect(topology.invalidRetrievalFilters).toBe(0);
    expect(topology.metadataOnlyTopics).toBeGreaterThanOrEqual(3);
  });

  it("keeps metadata-only topics structurally valid without expanding resources", () => {
    const holdoutCases = holdoutV4Cases();
    const resolved = resolveEvaluationResourcesForSplit(
      holdoutCases,
      groundedEvaluationResources
    );
    const metadata = resolveEvaluationMetadataForCases(holdoutCases, resolved);
    const topology = buildEvaluationTopologyReport({
      cases: holdoutCases,
      metadataScope: metadata,
    });

    expect(metadata.metadataOnlySubjectIds).toEqual([]);
    expect(metadata.metadataOnlyTopicIds).toHaveLength(4);
    expect(topology.invalidRetrievalFilters).toBe(0);
    expect(resolved).toHaveLength(26);
  });

  it("finds no exact contamination against older splits or application tests", () => {
    const findings = analyzeHoldoutV4Contamination({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
      testCorpus: readApplicationTestCorpus(),
    });
    const exactFindings = findings.filter(
      (item) => item.type !== "NEAR_DUPLICATE_QUERY"
    );

    expect(exactFindings).toEqual([]);
  });

  it("computes a deterministic v4 hash that changes with content mutation", () => {
    const currentHash = computeHoldoutV4SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
    const repeatedHash = computeHoldoutV4SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
    const mutatedCases = groundedEvaluationCases.map((item) =>
      item.split === HOLDOUT_V4_SPLIT
        ? {
            ...item,
            messages: item.messages.map((message, index) =>
              index === item.messages.length - 1
                ? { ...message, content: `${message.content} changed` }
                : message
            ),
          }
        : item
    );

    expect(currentHash).toBe(HOLDOUT_V4_HASH);
    expect(repeatedHash).toBe(HOLDOUT_V4_HASH);
    expect(
      computeHoldoutV4SplitHash({
        cases: mutatedCases,
        resources: groundedEvaluationResources,
      })
    ).not.toBe(HOLDOUT_V4_HASH);
  });

  it("dry-runs holdout_v4 without provider calls or DB mutations", async () => {
    const reportDir = await mkdtemp(path.join(os.tmpdir(), "holdout-v4-dry-run-"));
    const report = await runRuntimeGroundedEvaluationPreflight({
      split: HOLDOUT_V4_SPLIT,
      confirmHoldoutFixtureHash: HOLDOUT_V4_HASH,
      allowConsumedHoldoutDiagnostic: true,
      reportDir,
    });

    expect(report.dryRun).toBe(true);
    expect(report.providerCalls).toBe(0);
    expect(report.dbMutations).toBe(0);
    expect(report.resourceScope.seededResourceCount).toBe(26);
    expect(report.resourceScope.extraResourceCount).toBe(0);
    expect(report.topology.casesChecked).toBe(28);
    expect(report.topology.validRetrievalFilters).toBe(28);

    await rm(reportDir, { recursive: true, force: true });
  });

  it("records a deterministic split hash for manual_quality reports", async () => {
    const reportDir = await mkdtemp(path.join(os.tmpdir(), "manual-quality-dry-run-"));
    const first = await runRuntimeGroundedEvaluationPreflight({
      split: "manual_quality",
      reportDir,
    });
    const second = await runRuntimeGroundedEvaluationPreflight({
      split: "manual_quality",
      reportDir,
    });

    expect(first.splitHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.splitHash).toBe(second.splitHash);
    expect(first.providerCalls).toBe(0);
    expect(first.dbMutations).toBe(0);

    await rm(reportDir, { recursive: true, force: true });
  });

  it("keeps v4 one-shot guard isolated from consumed v3 markers", async () => {
    const reportDir = await mkdtemp(path.join(os.tmpdir(), "holdout-v4-guard-"));
    const v3Hash = computeHoldoutV3SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
    await recordHoldoutV3AcceptanceRun({
      splitHash: v3Hash,
      reportDir,
      runId: "consumed-v3-marker",
      runTimestamp: "2026-08-10T00:00:00.000Z",
      status: "FAILED",
      errorClass: "RetrievalError",
      failurePhase: "EVALUATOR_SETUP_FAILURE",
      modelEvaluationReached: false,
      chatGenerationReached: false,
      metricsProduced: false,
    });

    await expect(
      assertHoldoutV3AcceptanceRunAllowed({
        confirmSplitHash: v3Hash,
        computedSplitHash: v3Hash,
        reportDir,
      })
    ).rejects.toThrow("already has an acceptance-run record");

    await expect(
      assertHoldoutV4AcceptanceRunAllowed({
        confirmSplitHash: HOLDOUT_V4_HASH,
        computedSplitHash: HOLDOUT_V4_HASH,
        reportDir,
      })
    ).resolves.toBeUndefined();

    expect(
      await fileExists(
        holdoutV4RunRecordPath({ splitHash: HOLDOUT_V4_HASH, reportDir })
      )
    ).toBe(false);

    await expect(
      assertHoldoutV4AcceptanceRunAllowed({
        confirmSplitHash: "wrong",
        computedSplitHash: HOLDOUT_V4_HASH,
        reportDir,
      })
    ).rejects.toThrow("matching split hash");

    await expect(
      assertHoldoutV4AcceptanceRunAllowed({
        confirmSplitHash: HOLDOUT_V4_HASH,
        computedSplitHash: HOLDOUT_V4_HASH,
        reportDir,
        maxCases: 1,
      })
    ).rejects.toThrow("complete split");

    await rm(reportDir, { recursive: true, force: true });
  });

  it("permanently blocks v4 after a success or failure record is written", async () => {
    const reportDir = await mkdtemp(path.join(os.tmpdir(), "holdout-v4-consume-"));
    const recordPath = await recordHoldoutV4AcceptanceRun({
      splitHash: HOLDOUT_V4_HASH,
      reportDir,
      runId: "holdout-v4-test-run",
      runTimestamp: "2026-08-11T00:00:00.000Z",
      status: "FAILED",
      errorClass: "RetrievalError",
      failurePhase: "RETRIEVAL_FAILURE",
      modelEvaluationReached: false,
      chatGenerationReached: false,
      metricsProduced: false,
    });
    expect(JSON.parse(await readFile(recordPath, "utf8"))).toMatchObject({
      split: HOLDOUT_V4_SPLIT,
      status: "FAILED",
      failurePhase: "RETRIEVAL_FAILURE",
    });

    await expect(
      assertHoldoutV4AcceptanceRunAllowed({
        confirmSplitHash: HOLDOUT_V4_HASH,
        computedSplitHash: HOLDOUT_V4_HASH,
        reportDir,
      })
    ).rejects.toThrow("already has an acceptance-run record");

    await expect(
      assertHoldoutV4AcceptanceRunAllowed({
        confirmSplitHash: HOLDOUT_V4_HASH,
        computedSplitHash: HOLDOUT_V4_HASH,
        reportDir,
        allowDiagnostic: true,
        maxCases: 1,
      })
    ).resolves.toBeUndefined();

    await rm(reportDir, { recursive: true, force: true });
  });

  it("retains future answer text and segment evidence in review reports", () => {
    const reviewCase = buildReviewCase({
      evaluationCase: {
        id: "holdout-v4-review-retention",
        split: HOLDOUT_V4_SPLIT,
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
      versions: {
        prompt: HOLDOUT_V4_FROZEN_CONFIG.prompt,
        grounding: HOLDOUT_V4_FROZEN_CONFIG.grounding,
        sufficiency: HOLDOUT_V4_FROZEN_CONFIG.sufficiency,
      },
    });
    const report = buildReviewReport({
      runId: "holdout-v4-retention",
      runTimestamp: "2026-08-11T00:00:00.000Z",
      fixtureHash: "fixture-hash",
      splitHash: HOLDOUT_V4_HASH,
      sourceState: { commit: "commit", diffHash: "diff-hash", dirty: false },
      frozenConfig: HOLDOUT_V4_FROZEN_CONFIG,
      cases: [reviewCase],
    });

    expect(report.splitHash).toBe(HOLDOUT_V4_HASH);
    expect(report.cases[0].generatedAnswerText).toContain("retained");
    expect(report.cases[0].answerSegments[0].sourceLabels).toEqual(["SOURCE_1"]);
    expect(report.cases[0].citedExcerpts[0].excerpt).toContain("Bounded");
    expect(report.reportHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps holdout_v4 reports and run records ignored by git", async () => {
    const reportDir = await mkdtemp(path.join(os.tmpdir(), "holdout-v4-ignore-"));
    const ignoredPath = `${DEFAULT_REVIEW_REPORT_DIR}/holdout-v4-acceptance-sample.json`;
    await writeFile(path.join(reportDir, "placeholder"), "x", "utf8");

    expect(
      execFileSync("git", ["check-ignore", ignoredPath], {
        cwd: process.cwd(),
        encoding: "utf8",
      })
    ).toContain(DEFAULT_REVIEW_REPORT_DIR);

    await rm(reportDir, { recursive: true, force: true });
  });

  it("freezes holdout_v4 acceptance gates and recommendation ceiling", () => {
    expect(HOLDOUT_V4_ACCEPTANCE_GATES.safety.unsupportedAcceptedSegments).toBe(0);
    expect(HOLDOUT_V4_ACCEPTANCE_GATES.safety.invalidCitationRate).toBe(0);
    expect(HOLDOUT_V4_ACCEPTANCE_GATES.safety.citationValidity).toBe(1);
    expect(HOLDOUT_V4_ACCEPTANCE_GATES.answerability.answerabilityAccuracyMin).toBe(
      0.9
    );
    expect(
      HOLDOUT_V4_ACCEPTANCE_GATES.retrievalUsefulness.expectedSourceRecallMin
    ).toBe(0.85);
    expect(HOLDOUT_V4_ACCEPTANCE_GATES.manualQuality.formulaAccuracy).toBe(1);
    expect(HOLDOUT_V4_ACCEPTANCE_GATES.recommendationRules.allSyntheticGatesPass).toBe(
      "ENABLE_FOR_INTERNAL_TEST_USERS_MAX"
    );
  });
});

function holdoutV4Cases() {
  return groundedEvaluationCases.filter((item) => item.split === HOLDOUT_V4_SPLIT);
}

function resourcesThroughHoldoutV4() {
  const futureResourceIds = new Set(
    groundedEvaluationCases
      .filter(
        (item) =>
          item.split === "holdout_v5" || item.split === "adversarial_safety"
      )
      .flatMap((item) => [
        ...(item.corpusResourceIds ?? []),
        ...(item.expectedResourceIds ?? []),
        ...(item.setupResourceIds ?? []),
      ])
  );

  return groundedEvaluationResources.filter(
    (item) => !futureResourceIds.has(item.id)
  );
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
    .filter((item) => !item.endsWith("evaluation/holdout-v4.test.ts"));

  return files
    .map((filePath) => readFileSync(path.join(process.cwd(), filePath), "utf8"))
    .join("\n");
}
