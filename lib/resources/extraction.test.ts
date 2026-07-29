import { describe, expect, it } from "vitest";
import {
  ResourceChunkType,
  ResourceExtractionQuality,
} from "@prisma/client";
import { buildResourceChunks } from "./chunking";
import { extractDocument } from "./extraction";

describe("Stage 2 resource extraction and chunking", () => {
  it("extracts Markdown text with headings and structure-aware question chunks", () => {
    const extraction = extractDocument({
      buffer: Buffer.from(
        [
          "# Algebra",
          "",
          "Question 1. Solve x + 2 = 5.",
          "A. 1",
          "B. 3",
          "",
          "Question 2. Factorise x^2 - 9.",
          "Answer: (x - 3)(x + 3)",
        ].join("\n")
      ),
      mimeType: "text/markdown",
      fileName: "algebra.md",
    });

    expect(extraction.quality).toBe(ResourceExtractionQuality.HIGH);
    expect(extraction.headings.map((heading) => heading.text)).toContain(
      "Algebra"
    );
    expect(extraction.questionNumbers).toEqual(["1", "2"]);

    const chunks = buildResourceChunks({ extraction });
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      chunkType: ResourceChunkType.PAST_QUESTION,
      questionNumber: "1",
    });
    expect(chunks[1].content).toContain("Factorise");
  });

  it("marks scanned or unextractable PDFs as failed instead of approving them silently", () => {
    const extraction = extractDocument({
      buffer: Buffer.from("%PDF-1.4\n%%EOF"),
      mimeType: "application/pdf",
      fileName: "scan.pdf",
    });

    expect(extraction.quality).toBe(ResourceExtractionQuality.FAILED);
    expect(extraction.text).toBe("");
    expect(extraction.warnings.join(" ")).toContain("OCR");
  });
});
