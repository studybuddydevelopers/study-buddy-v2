import { ResourceChunkType, ResourceSourceKind } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { mergeHybridResults } from "./ranking";
import type { RetrievedChunk } from "./types";

describe("hybrid retrieval ranking", () => {
  it("uses reciprocal rank fusion without arbitrary production weights", () => {
    const results = mergeHybridResults({
      keywordResults: [
        chunk("b", { keywordRank: 1, resourceId: "resource-b", chunkIndex: 1 }),
        chunk("a", { keywordRank: 2, resourceId: "resource-a", chunkIndex: 1 }),
      ],
      vectorResults: [
        chunk("a", { vectorRank: 1, resourceId: "resource-a", chunkIndex: 1 }),
        chunk("c", { vectorRank: 2, resourceId: "resource-c", chunkIndex: 1 }),
      ],
      limit: 3,
      rrfK: 60,
    });

    expect(results.map((result) => result.id)).toEqual(["a", "b", "c"]);
    expect(results[0]?.keywordRank).toBe(2);
    expect(results[0]?.vectorRank).toBe(1);
  });

  it("suppresses exact duplicate content and retains alternate provenance", () => {
    const results = mergeHybridResults({
      keywordResults: [
        chunk("first", {
          keywordRank: 1,
          resourceId: "resource-a",
          content: "Same worked solution",
        }),
        chunk("second", {
          keywordRank: 2,
          resourceId: "resource-b",
          content: "same   worked solution!!!",
        }),
      ],
      vectorResults: [],
      limit: 5,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.alternateProvenance).toEqual([
      {
        resourceId: "resource-b",
        chunkId: "second",
        resourceTitle: "Resource resource-b",
      },
    ]);
  });

  it("uses deterministic tie-breaking independent of resource timestamps", () => {
    const results = mergeHybridResults({
      keywordResults: [
        chunk("z", { keywordRank: 1, resourceId: "resource-b", chunkIndex: 2 }),
        chunk("a", { keywordRank: 1, resourceId: "resource-a", chunkIndex: 2 }),
        chunk("m", { keywordRank: 1, resourceId: "resource-a", chunkIndex: 1 }),
      ],
      vectorResults: [],
      limit: 5,
    });

    expect(results.map((result) => result.id)).toEqual(["m", "a", "z"]);
  });
});

function chunk(
  id: string,
  overrides: Partial<RetrievedChunk> & {
    keywordRank?: number | null;
    vectorRank?: number | null;
  } = {}
): RetrievedChunk {
  const resourceId = overrides.resourceId ?? `resource-${id}`;
  return {
    id,
    resourceId,
    resourceTitle: `Resource ${resourceId}`,
    sourceKind: ResourceSourceKind.UPLOAD,
    chunkIndex: overrides.chunkIndex ?? 0,
    chunkType: ResourceChunkType.CONTENT_SECTION,
    title: null,
    content: overrides.content ?? `content ${id}`,
    snippet: overrides.snippet ?? overrides.content ?? `content ${id}`,
    contentHash: overrides.contentHash ?? `${id}-hash`,
    subjectId: overrides.subjectId ?? null,
    topicId: overrides.topicId ?? null,
    questionNumber: overrides.questionNumber ?? null,
    vectorRank: overrides.vectorRank ?? null,
    vectorDistance: overrides.vectorDistance ?? null,
    keywordRank: overrides.keywordRank ?? null,
    keywordScore: overrides.keywordScore ?? null,
    exactSignals: overrides.exactSignals ?? [],
    fusionScore: overrides.fusionScore ?? 0,
    bestBranchRank: overrides.bestBranchRank ?? Number.MAX_SAFE_INTEGER,
    alternateProvenance: overrides.alternateProvenance ?? [],
  };
}
