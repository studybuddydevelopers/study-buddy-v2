import { ResourceChunkType, ResourceSourceKind } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildBoundedSnippet,
  buildResourceChunkSearchText,
  normalizeContentForDeduplication,
  normalizedContentFingerprint,
} from "./search-text";

describe("resource chunk search text", () => {
  it("includes resource, chunk, and explicit exact-match signals", () => {
    const searchText = buildResourceChunkSearchText({
      resource: {
        title: "WAEC Mathematics 2021",
        description: "Paper 2",
        sourceKind: ResourceSourceKind.UPLOAD,
        subjectId: "maths",
        topicId: "algebra",
      },
      chunk: {
        title: "Linear equations",
        content: "Solve 2x + 3 = 9.",
        chunkType: ResourceChunkType.PAST_QUESTION,
        questionNumber: "5",
        pageStart: 4,
        metadata: {
          year: 2021,
          paperIdentifier: "WASSCE-MATHS-P2",
          unsafeLargeBlob: { ignored: true },
        },
      },
    });

    expect(searchText).toContain("WAEC Mathematics 2021");
    expect(searchText).toContain("Question 5");
    expect(searchText).toContain("year: 2021");
    expect(searchText).toContain("paperIdentifier: WASSCE-MATHS-P2");
    expect(searchText).not.toContain("unsafeLargeBlob");
  });

  it("normalizes exact duplicate content fingerprints", () => {
    expect(normalizeContentForDeduplication(" Same worked-solution! ")).toBe(
      "same workedsolution"
    );
    expect(normalizedContentFingerprint("Same worked solution")).toBe(
      normalizedContentFingerprint("same   worked solution!!!")
    );
  });

  it("uses bounded snippets instead of full resource text", () => {
    const content = "a ".repeat(300);
    expect(buildBoundedSnippet(content, 20)).toHaveLength(20);
    expect(buildBoundedSnippet(content, 20)).toMatch(/\.\.\.$/);
  });
});
