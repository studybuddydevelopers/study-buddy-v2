import { ResourceChunkType, ResourceSourceKind } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { runRetrievalEvaluation } from "./runner";
import type { RetrievedChunk } from "../types";

describe("retrieval evaluation runner", () => {
  it("reports labelled recall, MRR, forbidden rate, and filter accuracy", async () => {
    const report = await runRetrievalEvaluation({
      repository: {
        hybridSearch: async ({ query }) => {
          if (query === "hit") return [chunk("chunk-1", "resource-1")];
          if (query === "forbidden") return [chunk("chunk-2", "forbidden")];
          if (query === "wrong filter") {
            return [chunk("chunk-3", "resource-3", { subjectId: "subject-b" })];
          }
          return [];
        },
      },
      cases: [
        {
          id: "case-hit",
          split: "development",
          query: "hit",
          expectedChunkIds: ["chunk-1"],
          expectedResourceIds: ["resource-1"],
        },
        {
          id: "case-miss",
          split: "development",
          query: "miss",
          expectedChunkIds: ["missing"],
          expectedResourceIds: ["missing-resource"],
        },
        {
          id: "case-forbidden",
          split: "holdout",
          query: "forbidden",
          forbiddenResourceIds: ["forbidden"],
        },
        {
          id: "case-filter",
          split: "holdout",
          query: "wrong filter",
          filters: { subjectId: "subject-a" },
        },
        {
          id: "case-no-evidence",
          split: "holdout",
          query: "no evidence",
          expectNoEvidence: true,
        },
      ],
      split: "all",
      embeddingCoverage: {
        eligibleChunkCount: 10,
        completedChunkCount: 8,
        failedChunkCount: 1,
      },
    });

    expect(report.caseCount).toBe(5);
    expect(report.chunkRecallAt1).toBe(0.5);
    expect(report.resourceRecallAt1).toBe(0.5);
    expect(report.mrr).toBe(1);
    expect(report.forbiddenResultRate).toBe(0.2);
    expect(report.filterAccuracy).toBe(0.8);
    expect(report.correctNoEvidenceRate).toBe(1);
    expect(report.embeddingCoverage.ratio).toBe(0.8);
  });

  it("can evaluate a single split", async () => {
    const report = await runRetrievalEvaluation({
      repository: { hybridSearch: async () => [] },
      cases: [
        { id: "dev", split: "development", query: "dev" },
        { id: "hold", split: "holdout", query: "hold" },
      ],
      split: "holdout",
    });

    expect(report.caseCount).toBe(1);
    expect(report.results[0]?.caseId).toBe("hold");
  });
});

function chunk(
  id: string,
  resourceId: string,
  overrides: Partial<RetrievedChunk> = {}
): RetrievedChunk {
  return {
    id,
    resourceId,
    resourceTitle: `Resource ${resourceId}`,
    sourceKind: ResourceSourceKind.UPLOAD,
    chunkIndex: 0,
    chunkType: ResourceChunkType.CONTENT_SECTION,
    title: null,
    content: `content ${id}`,
    snippet: `content ${id}`,
    contentHash: `${id}-hash`,
    subjectId: overrides.subjectId ?? null,
    topicId: overrides.topicId ?? null,
    questionNumber: null,
    vectorRank: null,
    vectorDistance: null,
    keywordRank: null,
    keywordScore: null,
    exactSignals: [],
    fusionScore: 0,
    bestBranchRank: 1,
    alternateProvenance: [],
  };
}
