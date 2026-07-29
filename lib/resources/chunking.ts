import { createHash } from "node:crypto";
import { ResourceChunkType } from "@prisma/client";
import type { ExtractionResult } from "./extraction";

export interface ResourceChunkDraft {
  chunkType: ResourceChunkType;
  chunkIndex: number;
  title?: string;
  content: string;
  tokenEstimate: number;
  pageStart?: number;
  pageEnd?: number;
  questionNumber?: string;
  contentHash: string;
  metadata?: Record<string, unknown>;
}

interface ChunkInput {
  extraction: ExtractionResult;
  subjectId?: string | null;
  topicId?: string | null;
}

const TARGET_TOKENS = 700;
const OVERLAP_TOKENS = 80;

export function buildResourceChunks(input: ChunkInput): ResourceChunkDraft[] {
  const text = input.extraction.text.trim();
  if (!text) return [];

  const questionBlocks = splitQuestionBlocks(text);
  if (questionBlocks.length > 0) {
    return questionBlocks.flatMap((block) => {
      if (block.questionNumber) {
        return [
          toChunk(block.content, 0, {
            chunkType: ResourceChunkType.PAST_QUESTION,
            title: `Question ${block.questionNumber}`,
            questionNumber: block.questionNumber,
            metadata: { structure: "question_block" },
          }),
        ];
      }

      return splitLongText(block.content).map((content, partIndex) =>
        toChunk(content, 0, {
          chunkType: classifyChunk(content),
          title:
            block.title && partIndex > 0
              ? `${block.title} (${partIndex + 1})`
              : block.title,
          metadata: {
            structure: "pre_question_section",
            forcedSplit: partIndex > 0,
          },
        })
      );
    }).map((chunk, chunkIndex) => ({ ...chunk, chunkIndex }));
  }

  const sectionBlocks = splitHeadingSections(text);
  const expanded = sectionBlocks.flatMap((section) =>
    splitLongText(section.content).map((content, partIndex) => ({
      content,
      title:
        section.title && partIndex > 0
          ? `${section.title} (${partIndex + 1})`
          : section.title,
    }))
  );

  return expanded.map((block, index) =>
    toChunk(block.content, index, {
      chunkType: classifyChunk(block.content),
      title: block.title,
      metadata: { structure: "section_or_token_fallback" },
    })
  );
}

export function buildPastQuestionChunk(input: {
  questionText: string;
  answerText: string;
  explanationText?: string | null;
  questionNumber?: string | null;
}) {
  const content = [
    input.questionNumber ? `Question ${input.questionNumber}` : "Past question",
    "",
    input.questionText.trim(),
    "",
    `Answer: ${input.answerText.trim()}`,
    input.explanationText?.trim()
      ? `\nWorked solution: ${input.explanationText.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return toChunk(content, 0, {
    chunkType: ResourceChunkType.PAST_QUESTION,
    title: input.questionNumber ? `Question ${input.questionNumber}` : "Past question",
    questionNumber: input.questionNumber ?? undefined,
    metadata: {
      structure: "legacy_past_question",
      includesAnswer: true,
      includesWorkedSolution: Boolean(input.explanationText?.trim()),
    },
  });
}

export function hashContent(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function toChunk(
  content: string,
  chunkIndex: number,
  options: Omit<ResourceChunkDraft, "content" | "chunkIndex" | "tokenEstimate" | "contentHash">
): ResourceChunkDraft {
  const normalized = content.trim();
  return {
    ...options,
    chunkIndex,
    content: normalized,
    tokenEstimate: estimateTokens(normalized),
    contentHash: hashContent(normalized),
  };
}

function splitQuestionBlocks(text: string) {
  const pattern = /(?:^|\n)\s*(?:question\s*)?([0-9]{1,3})[.)]\s+/gi;
  const matches = Array.from(text.matchAll(pattern));
  if (matches.length === 0) return [];

  const blocks: Array<{
    title?: string;
    questionNumber?: string;
    content: string;
  }> = [];
  const firstStart = matches[0]?.index ?? 0;
  const preamble = text.slice(0, firstStart).trim();
  if (preamble.length >= 20) {
    blocks.push({
      title: firstHeading(preamble),
      content: preamble,
    });
  }

  blocks.push(
    ...matches
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? text.length;
      return {
        questionNumber: match[1],
        content: text.slice(start, end).trim(),
      };
    })
    .filter((block) => block.content.length >= 20)
  );

  return blocks;
}

function splitHeadingSections(text: string) {
  const lines = text.split("\n");
  const sections: Array<{ title?: string; content: string }> = [];
  let currentTitle: string | undefined;
  let currentLines: string[] = [];

  for (const line of lines) {
    const markdownHeading = line.trim().match(/^#{1,6}\s+(.+)$/);
    const plainHeading =
      !markdownHeading &&
      line.trim().length <= 90 &&
      line.trim().length > 0 &&
      line.trim() === line.trim().toUpperCase()
        ? line.trim()
        : undefined;

    const nextTitle = markdownHeading?.[1] ?? plainHeading;
    if (nextTitle) {
      if (currentLines.join("\n").trim()) {
        sections.push({ title: currentTitle, content: currentLines.join("\n") });
      }
      currentTitle = nextTitle;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.join("\n").trim()) {
    sections.push({ title: currentTitle, content: currentLines.join("\n") });
  }

  return sections.length > 0 ? sections : [{ content: text }];
}

function splitLongText(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= TARGET_TOKENS) return [text.trim()];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + TARGET_TOKENS, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = Math.max(end - OVERLAP_TOKENS, start + 1);
  }

  return chunks;
}

function classifyChunk(content: string) {
  const lower = content.toLowerCase();
  if (/\bmark scheme\b|\banswer key\b/.test(lower)) {
    return ResourceChunkType.MARK_SCHEME;
  }
  if (/\bworked solution\b|\bsolution\b|\bexplanation\b/.test(lower)) {
    return ResourceChunkType.WORKED_SOLUTION;
  }
  if (/\bobjective\b|\bsyllabus\b/.test(lower)) {
    return ResourceChunkType.SYLLABUS_OBJECTIVE;
  }
  if (/\bformula\b|\bequation\b/.test(lower)) {
    return ResourceChunkType.FORMULA_REFERENCE;
  }
  return ResourceChunkType.CONTENT_SECTION;
}

function estimateTokens(content: string) {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.33));
}

function firstHeading(content: string) {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine?.replace(/^#{1,6}\s+/, "").slice(0, 120);
}
