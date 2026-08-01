import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Stage 1 AI chat Prisma schema", () => {
  const schema = fs.readFileSync(
    path.resolve(__dirname, "schema.prisma"),
    "utf8"
  );

  it("keeps legacy AI question models while adding Stage 1 chat models", () => {
    expect(schema).toMatch(/model AiQuestion\s*{/);
    expect(schema).toMatch(/model AiQuestionMessage\s*{/);
    expect(schema).toMatch(/model AiChat\s*{/);
    expect(schema).toMatch(/model AiChatMessage\s*{/);
    expect(schema).toMatch(/model AiGenerationRequest\s*{/);
  });

  it("defines idempotency and message uniqueness constraints", () => {
    expect(schema).toMatch(/@@unique\(\[chatId, clientRequestId\]/);
    expect(schema).toMatch(/userMessageId\s+String\s+@unique/);
    expect(schema).toMatch(/assistantMessageId\s+String\s+@unique/);
  });

  it("documents stable ordering indexes for active chats and message history", () => {
    expect(schema).toMatch(/@@index\(\[userId, deletedAt, updatedAt, id\]/);
    expect(schema).toMatch(/@@index\(\[chatId, createdAt, id\]/);
  });

  it("keeps Stage 2 resource ingestion models and active chunk versions", () => {
    expect(schema).toMatch(/model Resource\s*{/);
    expect(schema).toMatch(/model ResourceChunk\s*{/);
    expect(schema).toMatch(/activeChunkVersion\s+Int\?/);
    expect(schema).toMatch(/activeChunkSetHash\s+String\?/);
    expect(schema).toMatch(/processingVersion\s+Int\?/);
    expect(schema).toMatch(/version\s+Int\s+@default\(1\)/);
    expect(schema).toMatch(/@@unique\(\[resourceId, version, chunkIndex\]/);
    expect(schema).toMatch(/enum ResourceProcessingStatus\s*{/);
    expect(schema).toMatch(/UPLOADED\s+PROCESSING\s+PROCESSED\s+FAILED/s);
  });

  it("adds Stage 3 retrieval models without changing legacy AI Q&A tables", () => {
    expect(schema).toMatch(/model ResourceEmbeddingConfiguration\s*{/);
    expect(schema).toMatch(/BUILDING\s+READY\s+ACTIVE\s+RETIRED\s+FAILED/s);
    expect(schema).toMatch(/model ResourceChunkEmbedding\s*{/);
    expect(schema).toMatch(/embedding\s+Unsupported\("vector"\)\?/);
    expect(schema).toMatch(/searchText\s+String\?/);
    expect(schema).toMatch(/searchVector\s+Unsupported\("tsvector"\)\?/);
    expect(schema).toMatch(/@@unique\(\[resourceChunkId, configurationId, contentHash\]/);
  });

  it("adds Stage 4 grounding attempts and citations without replacing Stage 1 chats", () => {
    expect(schema).toMatch(/enum AiGroundingSufficiencyStatus\s*{/);
    expect(schema).toMatch(/model AiGroundingAttempt\s*{/);
    expect(schema).toMatch(/generationRequestId\s+String/);
    expect(schema).toMatch(/assistantMessageId\s+String/);
    expect(schema).toMatch(/selectedEvidenceMetadata\s+Json/);
    expect(schema).toMatch(/sufficiencyPolicyVersion\s+String/);
    expect(schema).toMatch(/@@unique\(\[generationRequestId, attemptNumber\]/);
    expect(schema).toMatch(/model AiMessageCitation\s*{/);
    expect(schema).toMatch(/sourceLabel\s+String/);
    expect(schema).toMatch(/contentHash\s+String/);
    expect(schema).toMatch(/@@unique\(\[groundingAttemptId, sourceLabel\]/);
    expect(schema).toMatch(/@@unique\(\[groundingAttemptId, resourceChunkId, contentHash\]/);
    expect(schema).toMatch(/currentGroundingAttemptId\s+String\?\s+@unique/);
  });
});
