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
  validateHoldoutV3FixtureReferences,
} from "./holdout-v3";
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
    const resolved = resolveEvaluationResourcesForSplit(
      holdoutCases,
      groundedEvaluationResources
    );
    const scope = buildEvaluationResourceScope({
      split: HOLDOUT_V3_SPLIT,
      cases: holdoutCases,
      allResources: groundedEvaluationResources,
      resolvedResources: resolved,
    });

    expect(groundedEvaluationResources).toHaveLength(55);
    expect(scope.selectedCaseCount).toBe(28);
    expect(scope.referencedResourceCount).toBe(25);
    expect(scope.seededResourceCount).toBe(25);
    expect(scope.unreferencedResourceCount).toBe(30);
    expect(scope.extraResourceCount).toBe(0);
    expect(resolved.every((item) => item.id.includes("holdout-v3"))).toBe(true);
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
