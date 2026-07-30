import { createHash } from "node:crypto";
import { ResourceChunkType, ResourceSourceKind } from "@prisma/client";

export interface SearchTextResourceInput {
  title: string;
  description?: string | null;
  sourceKind: ResourceSourceKind | string;
  subjectId?: string | null;
  topicId?: string | null;
  contentHash?: string | null;
}

export interface SearchTextChunkInput {
  title?: string | null;
  content: string;
  chunkType: ResourceChunkType | string;
  questionNumber?: string | null;
  pageStart?: number | null;
  pageEnd?: number | null;
  metadata?: unknown;
}

export function buildResourceChunkSearchText(input: {
  resource: SearchTextResourceInput;
  chunk: SearchTextChunkInput;
}) {
  const { resource, chunk } = input;
  return compactTextParts([
    resource.title,
    resource.description,
    String(resource.sourceKind),
    resource.subjectId ? `Subject ${resource.subjectId}` : null,
    resource.topicId ? `Topic ${resource.topicId}` : null,
    chunk.title,
    String(chunk.chunkType),
    chunk.questionNumber ? `Question ${chunk.questionNumber}` : null,
    chunk.pageStart ? `Page ${chunk.pageStart}` : null,
    chunk.pageEnd && chunk.pageEnd !== chunk.pageStart
      ? `Page ${chunk.pageEnd}`
      : null,
    selectedMetadataText(chunk.metadata),
    chunk.content,
  ]);
}

export function normalizedContentFingerprint(content: string) {
  return createHash("sha256")
    .update(normalizeContentForDeduplication(content))
    .digest("hex");
}

export function normalizeContentForDeduplication(content: string) {
  return content
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

export function buildBoundedSnippet(content: string, maxLength = 420) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function compactTextParts(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 120_000);
}

function selectedMetadataText(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const record = metadata as Record<string, unknown>;
  const safeKeys = [
    "year",
    "paperYear",
    "paper",
    "paperCode",
    "paperIdentifier",
    "questionNumber",
    "section",
    "heading",
    "structure",
  ];
  const parts = safeKeys.flatMap((key) => {
    const value = record[key];
    if (value === null || value === undefined) return [];
    if (typeof value === "string" || typeof value === "number") {
      return [`${key}: ${String(value)}`];
    }
    return [];
  });

  return parts.length > 0 ? parts.join("\n") : null;
}
