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
  HOLDOUT_V3_ACCEPTANCE_GATES,
  HOLDOUT_V3_FIXTURE_SCHEMA_VERSION,
  HOLDOUT_V3_FROZEN_CONFIG,
  HOLDOUT_V3_SPLIT,
  analyzeHoldoutV3Contamination,
  assertHoldoutV3AcceptanceRunAllowed,
  computeHoldoutV3SplitHash,
  recordHoldoutV3AcceptanceRun,
  summarizeHoldoutV3Split,
  updateHoldoutV3AcceptanceRun,
  validateHoldoutV3FixtureReferences,
} from "./holdout-v3";
import {
  assertEvaluationTopology,
  buildEvaluationTopologyReport,
  resolveEvaluationMetadataForCases,
} from "./metadata-scope";
import {
  groundedEvaluationCases,
  groundedEvaluationResources,
} from "./fixtures";
import {
  buildEvaluationResourceScope,
  resolveEvaluationResourcesForSplit,
} from "./resource-scope";
import { runRuntimeGroundedEvaluationPreflight } from "./runtime-runner";
import type { GroundedEvaluationCase } from "./types";

describe("Stage 4 holdout_v3 preparation", () => {
  it("defines a fresh balanced split with at least 24 cases", () => {
    const summary = summarizeHoldoutV3Split({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });

    expect(summary.fixtureSchemaVersion).toBe(HOLDOUT_V3_FIXTURE_SCHEMA_VERSION);
    expect(summary.caseCount).toBe(28);
    expect(summary.supportedCount).toBe(14);
    expect(summary.refusalCount).toBe(14);
    expect(summary.resourceCount).toBeGreaterThanOrEqual(20);
    expect(summary.splitHash).toBe(
      "11f51f4ac9459de796f28a76d79011f983fe929edcca17e006fbb045646ebcb1"
    );
  });

  it("keeps ids unique and holdout_v3 separate from older splits", () => {
    const ids = groundedEvaluationCases.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    const holdoutCases = groundedEvaluationCases.filter(
      (item) => item.split === HOLDOUT_V3_SPLIT
    );
    expect(holdoutCases.every((item) => item.id.startsWith("holdout-v3-"))).toBe(
      true
    );
    expect(holdoutCases.every((item) => item.notes?.includes("Copied") !== true)).toBe(
      true
    );
  });

  it("validates holdout_v3 resource and chunk references", () => {
    expect(
      validateHoldoutV3FixtureReferences({
        cases: groundedEvaluationCases,
        resources: groundedEvaluationResources,
      })
    ).toEqual([]);
  });

  it("resolves exactly the holdout_v3 resources and excludes unrelated fixtures", () => {
    const holdoutCases = groundedEvaluationCases.filter(
      (item) => item.split === HOLDOUT_V3_SPLIT
    );
    const historicalResources = historicalResourcesThroughHoldoutV3();
    const resolved = resolveEvaluationResourcesForSplit(
      holdoutCases,
      historicalResources
    );
    const scope = buildEvaluationResourceScope({
      split: HOLDOUT_V3_SPLIT,
      cases: holdoutCases,
      allResources: historicalResources,
      resolvedResources: resolved,
    });

    expect(historicalResources).toHaveLength(73);
    expect(scope.selectedCaseCount).toBe(28);
    expect(scope.referencedResourceCount).toBe(25);
    expect(scope.seededResourceCount).toBe(25);
    expect(scope.unreferencedResourceCount).toBe(48);
    expect(scope.extraResourceCount).toBe(0);
    expect(resolved.every((item) => item.id.includes("holdout-v3"))).toBe(true);
  });

  it("resolves case-level metadata independently from selected resources", () => {
    const holdoutCases = groundedEvaluationCases.filter(
      (item) => item.split === HOLDOUT_V3_SPLIT
    );
    const resolved = resolveEvaluationResourcesForSplit(
      holdoutCases,
      groundedEvaluationResources
    );
    const metadata = resolveEvaluationMetadataForCases(holdoutCases, resolved);

    expect(metadata.selectedCaseCount).toBe(28);
    expect(metadata.metadataOnlySubjectIds).toEqual([]);
    expect(metadata.metadataOnlyTopicIds).toEqual([
      "eval-topic-cell-division",
      "eval-topic-earth-waves",
      "eval-topic-grammar",
      "eval-topic-reading-practice",
    ]);
    expect(metadata.resourceTopicIds).not.toContain("eval-topic-earth-waves");
  });

  it("passes topology preflight for all consumed holdout_v3 cases", () => {
    const holdoutCases = groundedEvaluationCases.filter(
      (item) => item.split === HOLDOUT_V3_SPLIT
    );
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
    expect(topology.metadataOnlyTopics).toBe(4);
    expect(() => assertEvaluationTopology(topology)).not.toThrow();
  });

  it("keeps the four previous metadata-gap cases structurally executable", () => {
    const previousFailures = new Set([
      "holdout-v3-refusal-no-seismic-evidence",
      "holdout-v3-refusal-wrong-subject-valency",
      "holdout-v3-refusal-latest-waec-deadline",
      "holdout-v3-refusal-user-bypass-no-evidence",
    ]);
    const holdoutCases = groundedEvaluationCases.filter(
      (item) => item.split === HOLDOUT_V3_SPLIT
    );
    const resolved = resolveEvaluationResourcesForSplit(
      holdoutCases,
      groundedEvaluationResources
    );
    const metadata = resolveEvaluationMetadataForCases(holdoutCases, resolved);
    const topology = buildEvaluationTopologyReport({
      cases: holdoutCases,
      metadataScope: metadata,
    });

    expect(
      topology.cases
        .filter((item) => previousFailures.has(item.caseId))
        .map((item) => ({
          caseId: item.caseId,
          validRetrievalFilters: item.validRetrievalFilters,
        }))
    ).toEqual([
      {
        caseId: "holdout-v3-refusal-no-seismic-evidence",
        validRetrievalFilters: true,
      },
      {
        caseId: "holdout-v3-refusal-wrong-subject-valency",
        validRetrievalFilters: true,
      },
      {
        caseId: "holdout-v3-refusal-latest-waec-deadline",
        validRetrievalFilters: true,
      },
      {
        caseId: "holdout-v3-refusal-user-bypass-no-evidence",
        validRetrievalFilters: true,
      },
    ]);
  });

  it("allows a valid metadata-only topic with no selected resources", () => {
    const cases: GroundedEvaluationCase[] = [
      {
        id: "metadata-only-topic",
        split: HOLDOUT_V3_SPLIT,
        messages: [{ role: "USER", content: "Explain a missing topic." }],
        subjectId: "eval-subject-physics",
        topicId: "eval-topic-empty-corpus",
        shouldAnswer: false,
        forbiddenClaims: ["missing topic"],
      },
    ];
    const metadata = resolveEvaluationMetadataForCases(cases, []);
    const topology = buildEvaluationTopologyReport({ cases, metadataScope: metadata });

    expect(metadata.subjectIds).toEqual(["eval-subject-physics"]);
    expect(metadata.topics).toEqual([
      { id: "eval-topic-empty-corpus", subjectId: "eval-subject-physics" },
    ]);
    expect(metadata.metadataOnlyTopicIds).toEqual(["eval-topic-empty-corpus"]);
    expect(topology.validRetrievalFilters).toBe(1);
    expect(topology.invalidRetrievalFilters).toBe(0);
  });

  it("keeps mismatched subject/topic metadata invalid", () => {
    const cases: GroundedEvaluationCase[] = [
      {
        id: "declares-topic",
        split: HOLDOUT_V3_SPLIT,
        messages: [{ role: "USER", content: "Declare topic." }],
        subjectId: "eval-subject-physics",
        topicId: "eval-topic-shared",
        shouldAnswer: false,
        forbiddenClaims: ["shared"],
      },
    ];

    expect(() =>
      resolveEvaluationMetadataForCases(cases, [
        {
          id: "conflicting-resource-topic",
          title: "Conflicting Topic",
          subjectId: "eval-subject-chemistry",
          topicId: "eval-topic-shared",
          chunkId: "conflicting-resource-topic-chunk",
          chunkType: "CONTENT_SECTION",
          content: "Conflicting metadata.",
          provenance: "Synthetic",
          usageRights: "Synthetic",
        },
      ])
    ).toThrow("declared under both");
  });

  it.each(["development", "regression", "manual_quality"] as const)(
    "scopes %s resources without falling back to the global fixture list",
    (split) => {
      const cases = groundedEvaluationCases.filter((item) => item.split === split);
      const resolved = resolveEvaluationResourcesForSplit(
        cases,
        groundedEvaluationResources
      );
      const scope = buildEvaluationResourceScope({
        split,
        cases,
        allResources: groundedEvaluationResources,
        resolvedResources: resolved,
      });

      expect(scope.seededResourceCount).toBeGreaterThan(0);
      expect(scope.seededResourceCount).toBeLessThan(
        groundedEvaluationResources.length
      );
      expect(scope.extraResourceCount).toBe(0);
    }
  );

  it("deduplicates repeated resource references deterministically", () => {
    const resource = groundedEvaluationResources[0]!;
    const cases: GroundedEvaluationCase[] = [
      {
        id: "dedupe-resource",
        split: HOLDOUT_V3_SPLIT,
        messages: [{ role: "USER", content: "scope check" }],
        shouldAnswer: true,
        expectedResourceIds: [resource.id, resource.id],
        expectedChunkIds: [resource.chunkId],
      },
    ];

    expect(resolveEvaluationResourcesForSplit(cases, groundedEvaluationResources)).toEqual([
      resource,
    ]);
  });

  it("fails for missing resource and chunk references", () => {
    const baseCase: GroundedEvaluationCase = {
      id: "missing-reference",
      split: HOLDOUT_V3_SPLIT,
      messages: [{ role: "USER", content: "scope check" }],
      shouldAnswer: true,
    };

    expect(() =>
      resolveEvaluationResourcesForSplit(
        [{ ...baseCase, expectedResourceIds: ["missing-resource"] }],
        groundedEvaluationResources
      )
    ).toThrow("missing resource");
    expect(() =>
      resolveEvaluationResourcesForSplit(
        [{ ...baseCase, expectedChunkIds: ["missing-chunk"] }],
        groundedEvaluationResources
      )
    ).toThrow("missing chunk");
  });

  it("requires trap/setup evidence to be declared explicitly", () => {
    const setupResource = groundedEvaluationResources.find(
      (item) => item.id === "eval-holdout-v3-math-circle-area-adjacent"
    )!;
    const cases: GroundedEvaluationCase[] = [
      {
        id: "declared-trap-resource",
        split: HOLDOUT_V3_SPLIT,
        messages: [{ role: "USER", content: "scope check" }],
        shouldAnswer: false,
        setupResourceIds: [setupResource.id],
      },
    ];

    expect(resolveEvaluationResourcesForSplit(cases, groundedEvaluationResources)).toEqual([
      setupResource,
    ]);
  });

  it("dry-runs a non-holdout split without provider calls or seeded resources", async () => {
    const report = await runRuntimeGroundedEvaluationPreflight({
      split: "development",
    });

    expect(report.dryRun).toBe(true);
    expect(report.resourceScope.selectedSplit).toBe("development");
    expect(report.resourceScope.seededResourceCount).toBeLessThan(
      groundedEvaluationResources.length
    );
    expect(report.resourceScope.extraResourceCount).toBe(0);
  });

  it("dry-runs consumed holdout_v3 topology without expanding resource scope", async () => {
    const splitHash = computeHoldoutV3SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
    const reportDir = await mkdtemp(path.join(os.tmpdir(), "holdout-v3-dry-run-"));
    await recordHoldoutV3AcceptanceRun({
      splitHash,
      reportDir,
      runId: "consumed-marker",
      runTimestamp: "2026-08-10T00:00:00.000Z",
      status: "FAILED",
      errorClass: "RetrievalError",
      failurePhase: "EVALUATOR_SETUP_FAILURE",
      modelEvaluationReached: false,
      chatGenerationReached: false,
      metricsProduced: false,
    });

    await expect(
      runRuntimeGroundedEvaluationPreflight({
        split: HOLDOUT_V3_SPLIT,
        confirmHoldoutFixtureHash: splitHash,
        reportDir,
      })
    ).rejects.toThrow("already has an acceptance-run record");

    const report = await runRuntimeGroundedEvaluationPreflight({
      split: HOLDOUT_V3_SPLIT,
      confirmHoldoutFixtureHash: splitHash,
      allowConsumedHoldoutDiagnostic: true,
      reportDir,
    });
    const diagnosticResourceUniverse = resourcesExcludingSplit("holdout_v4");

    expect(report.dryRun).toBe(true);
    expect(report.resourceScope.selectedCaseCount).toBe(28);
    expect(report.resourceScope.globalResourceCount).toBe(
      diagnosticResourceUniverse.length
    );
    expect(report.resourceScope.seededResourceCount).toBe(25);
    expect(report.resourceScope.unreferencedResourceCount).toBe(
      diagnosticResourceUniverse.length - 25
    );
    expect(report.resourceScope.extraResourceCount).toBe(0);
    expect(report.resourceScope.referencedChunkCount).toBe(25);
    expect(report.resourceScope.embeddedChunkCount).toBe(25);
    expect(report.topology.casesChecked).toBe(28);
    expect(report.topology.validRetrievalFilters).toBe(28);
    expect(report.topology.invalidRetrievalFilters).toBe(0);
    expect(report.topology.metadataOnlyTopics).toBe(4);
    expect(report.metadataScope.metadataOnlyTopicIds).toEqual([
      "eval-topic-cell-division",
      "eval-topic-earth-waves",
      "eval-topic-grammar",
      "eval-topic-reading-practice",
    ]);

    await rm(reportDir, { recursive: true, force: true });
  });

  it("keeps supported required facts present in expected synthetic evidence", () => {
    const resourcesById = new Map(
      groundedEvaluationResources.map((item) => [item.id, item])
    );
    const supportedCases = groundedEvaluationCases.filter(
      (item) => item.split === HOLDOUT_V3_SPLIT && item.shouldAnswer
    );

    for (const item of supportedCases) {
      const evidence = (item.expectedResourceIds ?? [])
        .map((resourceId) => resourcesById.get(resourceId)?.content ?? "")
        .join(" ")
        .toLowerCase();
      for (const fact of item.requiredFacts ?? []) {
        expect(evidence, `${item.id} should evidence ${fact}`).toContain(
          fact.toLowerCase()
        );
      }
    }
  });

  it("finds no duplicate or contaminated holdout_v3 cases", () => {
    const findings = analyzeHoldoutV3Contamination({
      cases: groundedEvaluationCases,
      testCorpus: readApplicationTestCorpus(),
    });

    expect(findings).toEqual([]);
  });

  it("computes a deterministic split-only hash that changes with case content", () => {
    const currentHash = computeHoldoutV3SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
    const repeatedHash = computeHoldoutV3SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
    const mutatedCases = groundedEvaluationCases.map((item) =>
      item.split === HOLDOUT_V3_SPLIT
        ? {
            ...item,
            messages: item.messages.map((message, index) =>
              index === item.messages.length - 1
                ? { ...message, content: `${message.content} altered` }
                : message
            ),
          }
        : item
    );

    expect(currentHash).toBe(repeatedHash);
    expect(
      computeHoldoutV3SplitHash({
        cases: mutatedCases,
        resources: groundedEvaluationResources,
      })
    ).not.toBe(currentHash);
  });

  it("requires the expected split hash and enforces one-shot acceptance records", async () => {
    const splitHash = computeHoldoutV3SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
    const reportDir = await mkdtemp(path.join(os.tmpdir(), "holdout-v3-guard-"));

    await expect(
      assertHoldoutV3AcceptanceRunAllowed({
        confirmSplitHash: "wrong",
        computedSplitHash: splitHash,
        reportDir,
      })
    ).rejects.toThrow("matching split hash");

    await expect(
      assertHoldoutV3AcceptanceRunAllowed({
        confirmSplitHash: splitHash,
        computedSplitHash: splitHash,
        reportDir,
        maxCases: 1,
      })
    ).rejects.toThrow("complete split");

    await expect(
      assertHoldoutV3AcceptanceRunAllowed({
        confirmSplitHash: splitHash,
        computedSplitHash: splitHash,
        reportDir,
      })
    ).resolves.toBeUndefined();

    const recordPath = await recordHoldoutV3AcceptanceRun({
      splitHash,
      reportDir,
      runId: "holdout-v3-test-run",
      runTimestamp: "2026-08-09T00:00:00.000Z",
      reportHash: "report-hash",
      status: "SUCCEEDED",
      failurePhase: "COMPLETED",
      modelEvaluationReached: true,
      chatGenerationReached: true,
      metricsProduced: true,
    });
    expect(await readFile(recordPath, "utf8")).toContain("report-hash");

    await expect(
      assertHoldoutV3AcceptanceRunAllowed({
        confirmSplitHash: splitHash,
        computedSplitHash: splitHash,
        reportDir,
      })
    ).rejects.toThrow("already has an acceptance-run record");

    await expect(
      assertHoldoutV3AcceptanceRunAllowed({
        confirmSplitHash: splitHash,
        computedSplitHash: splitHash,
        reportDir,
        allowDiagnostic: true,
        maxCases: 1,
      })
    ).resolves.toBeUndefined();

    await rm(reportDir, { recursive: true, force: true });
  });

  it("records future holdout_v3 run phases without weakening one-shot blocking", async () => {
    const splitHash = computeHoldoutV3SplitHash({
      cases: groundedEvaluationCases,
      resources: groundedEvaluationResources,
    });
    const reportDir = await mkdtemp(path.join(os.tmpdir(), "holdout-v3-phase-"));
    const recordPath = await recordHoldoutV3AcceptanceRun({
      splitHash,
      reportDir,
      runId: "phase-test-run",
      runTimestamp: "2026-08-10T00:00:00.000Z",
      status: "STARTED",
    });

    expect(JSON.parse(await readFile(recordPath, "utf8"))).toMatchObject({
      status: "STARTED",
      failurePhase: null,
      modelEvaluationReached: false,
      chatGenerationReached: false,
      metricsProduced: false,
    });

    await updateHoldoutV3AcceptanceRun({
      splitHash,
      reportDir,
      runId: "phase-test-run",
      runTimestamp: "2026-08-10T00:00:00.000Z",
      status: "FAILED",
      errorClass: "RetrievalError",
      failurePhase: "RETRIEVAL_FAILURE",
      modelEvaluationReached: false,
      chatGenerationReached: false,
      metricsProduced: false,
    });

    expect(JSON.parse(await readFile(recordPath, "utf8"))).toMatchObject({
      status: "FAILED",
      errorClass: "RetrievalError",
      failurePhase: "RETRIEVAL_FAILURE",
      modelEvaluationReached: false,
      chatGenerationReached: false,
      metricsProduced: false,
    });

    await expect(
      assertHoldoutV3AcceptanceRunAllowed({
        confirmSplitHash: splitHash,
        computedSplitHash: splitHash,
        reportDir,
      })
    ).rejects.toThrow("already has an acceptance-run record");

    await rm(reportDir, { recursive: true, force: true });
  });

  it("retains answer text and segment review fields for future holdout reports", () => {
    const reviewCase = buildReviewCase({
      evaluationCase: {
        id: "holdout-v3-review-retention",
        split: HOLDOUT_V3_SPLIT,
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
          validatorVersion: "grounding-validator-v1.3",
        },
      ],
      versions: {
        prompt: HOLDOUT_V3_FROZEN_CONFIG.prompt,
        grounding: HOLDOUT_V3_FROZEN_CONFIG.grounding,
        sufficiency: HOLDOUT_V3_FROZEN_CONFIG.sufficiency,
      },
    });
    const report = buildReviewReport({
      runId: "holdout-v3-retention",
      runTimestamp: "2026-08-09T00:00:00.000Z",
      fixtureHash: "fixture-hash",
      splitHash: "split-hash",
      sourceState: { commit: "commit", diffHash: "diff-hash", dirty: false },
      frozenConfig: HOLDOUT_V3_FROZEN_CONFIG,
      cases: [reviewCase],
    });

    expect(report.splitHash).toBe("split-hash");
    expect(report.cases[0].generatedAnswerText).toContain("retained");
    expect(report.cases[0].answerSegments[0].sourceLabels).toEqual(["SOURCE_1"]);
    expect(report.cases[0].groundingValidatorResults[0].supported).toBe(true);
    expect(report.cases[0].citedExcerpts[0].excerpt).toContain("Bounded");
    expect(report.cases[0].answerContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(report.reportHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps holdout_v3 reports and run records ignored by git", async () => {
    const reportDir = await mkdtemp(path.join(os.tmpdir(), "holdout-v3-ignore-"));
    const ignoredPath = `${DEFAULT_REVIEW_REPORT_DIR}/holdout-v3-acceptance-sample.json`;
    await writeFile(path.join(reportDir, "placeholder"), "x", "utf8");

    expect(
      execFileSync("git", ["check-ignore", ignoredPath], {
        cwd: process.cwd(),
        encoding: "utf8",
      })
    ).toContain(DEFAULT_REVIEW_REPORT_DIR);

    await rm(reportDir, { recursive: true, force: true });
  });

  it("freezes the future holdout_v3 acceptance gates before execution", () => {
    expect(HOLDOUT_V3_ACCEPTANCE_GATES.safety.unsupportedAcceptedSegments).toBe(0);
    expect(HOLDOUT_V3_ACCEPTANCE_GATES.safety.invalidCitationRate).toBe(0);
    expect(HOLDOUT_V3_ACCEPTANCE_GATES.safety.citationValidity).toBe(1);
    expect(HOLDOUT_V3_ACCEPTANCE_GATES.answerability.answerabilityAccuracyMin).toBe(
      0.9
    );
    expect(
      HOLDOUT_V3_ACCEPTANCE_GATES.retrievalUsefulness.expectedSourceRecallMin
    ).toBe(0.85);
    expect(HOLDOUT_V3_ACCEPTANCE_GATES.manualQuality.formulaAccuracy).toBe(1);
  });
});

function readApplicationTestCorpus() {
  const files = execFileSync("rg", ["--files", "-g", "*.test.ts", "-g", "*.test.tsx"], {
    cwd: process.cwd(),
    encoding: "utf8",
  })
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !item.endsWith("evaluation/holdout-v3.test.ts"));

  return files
    .map((filePath) => readFileSync(path.join(process.cwd(), filePath), "utf8"))
    .join("\n");
}

function historicalResourcesThroughHoldoutV3() {
  const holdoutV4ResourceIds = new Set(
    groundedEvaluationCases
      .filter(
        (item) =>
          item.split === "holdout_v4" ||
          item.split === "holdout_v5" ||
          item.split === "holdout_v6" ||
          item.split === "post_v5_regression" ||
          item.split === "adversarial_safety"
      )
      .flatMap((item) => [
        ...(item.corpusResourceIds ?? []),
        ...(item.expectedResourceIds ?? []),
        ...(item.setupResourceIds ?? []),
      ])
  );

  return groundedEvaluationResources.filter(
    (item) => !holdoutV4ResourceIds.has(item.id)
  );
}

function resourcesExcludingSplit(split: GroundedEvaluationCase["split"]) {
  const excludedSplits =
    split === "holdout_v4"
      ? new Set([split, "holdout_v5", "holdout_v6"])
      : new Set([split]);
  const resourceIds = new Set(
    groundedEvaluationCases
      .filter((item) => excludedSplits.has(item.split))
      .flatMap((item) => [
        ...(item.corpusResourceIds ?? []),
        ...(item.expectedResourceIds ?? []),
        ...(item.setupResourceIds ?? []),
      ])
  );

  return groundedEvaluationResources.filter((item) => !resourceIds.has(item.id));
}
