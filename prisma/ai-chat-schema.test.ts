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

  it("adds Stage 2 resource ingestion models without vector or embedding tables", () => {
    expect(schema).toMatch(/model Resource\s*{/);
    expect(schema).toMatch(/model ResourceChunk\s*{/);
    expect(schema).toMatch(/enum ResourceProcessingStatus\s*{/);
    expect(schema).toMatch(/UPLOADED\s+PROCESSING\s+PROCESSED\s+FAILED/s);
    expect(schema).not.toMatch(/ResourceChunkEmbedding|pgvector|vector\(/i);
  });
});
