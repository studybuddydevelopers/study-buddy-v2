import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Stage 4 grounded chat migration", () => {
  const migration = fs.readFileSync(
    path.resolve(
      __dirname,
      "migrations/20260729150000_add_grounded_chat_stage_4/migration.sql"
    ),
    "utf8"
  );

  it("adds grounding attempts and citations with safe uniqueness constraints", () => {
    expect(migration).toMatch(/CREATE TABLE "AiGroundingAttempt"/);
    expect(migration).toMatch(/CREATE TABLE "AiMessageCitation"/);
    expect(migration).toMatch(/"selectedEvidenceMetadata" JSONB NOT NULL/);
    expect(migration).toMatch(/"AiGroundingAttempt_request_attemptNumber_key"/);
    expect(migration).toMatch(/"AiMessageCitation_attempt_sourceLabel_key"/);
    expect(migration).toMatch(/"AiMessageCitation_attempt_chunk_hash_key"/);
    expect(migration).toMatch(/"currentGroundingAttemptId" TEXT/);
  });

  it("keeps Stage 4 rollback scoped to chat grounding data", () => {
    expect(migration).not.toMatch(/DROP TABLE "AiQuestion"/);
    expect(migration).not.toMatch(/DROP TABLE "Resource"/);
    expect(migration).not.toMatch(/DROP TABLE "ResourceChunkEmbedding"/);
  });
});
