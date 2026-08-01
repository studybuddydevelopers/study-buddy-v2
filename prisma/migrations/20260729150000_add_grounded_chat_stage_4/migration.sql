-- Stage 4: feature-gated grounded TEACH generation diagnostics and citations.
-- This migration does not add tutor modes, ingestion, embeddings, retrieval indexes, or public web search.

CREATE TYPE "AiGroundingSufficiencyStatus" AS ENUM (
  'SUFFICIENT',
  'INSUFFICIENT'
);

CREATE TYPE "AiGroundingSufficiencyReason" AS ENUM (
  'SUPPORTED',
  'NO_RESULTS',
  'LOW_RELEVANCE',
  'FILTERED_CORPUS_GAP',
  'POSSIBLE_CONFLICT',
  'MISSING_REQUIRED_SOURCE_TYPE'
);

CREATE TYPE "AiGroundingConfidence" AS ENUM (
  'HIGH',
  'MEDIUM',
  'LOW'
);

CREATE TABLE "AiGroundingAttempt" (
  "id" TEXT NOT NULL,
  "generationRequestId" TEXT NOT NULL,
  "assistantMessageId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "retrievalQuery" TEXT NOT NULL,
  "embeddingConfigurationId" TEXT,
  "sufficiencyStatus" "AiGroundingSufficiencyStatus" NOT NULL,
  "sufficiencyReason" "AiGroundingSufficiencyReason" NOT NULL,
  "confidence" "AiGroundingConfidence" NOT NULL,
  "selectedEvidenceMetadata" JSONB NOT NULL,
  "groundingVersion" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "sufficiencyPolicyVersion" TEXT NOT NULL,
  "retrievalDurationMs" INTEGER,
  "generationDurationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiGroundingAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiGroundingAttempt_attemptNumber_positive_check" CHECK ("attemptNumber" > 0),
  CONSTRAINT "AiGroundingAttempt_durations_non_negative_check" CHECK (
    ("retrievalDurationMs" IS NULL OR "retrievalDurationMs" >= 0)
    AND ("generationDurationMs" IS NULL OR "generationDurationMs" >= 0)
  )
);

CREATE TABLE "AiMessageCitation" (
  "id" TEXT NOT NULL,
  "groundingAttemptId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "resourceChunkId" TEXT NOT NULL,
  "sourceLabel" TEXT NOT NULL,
  "retrievalRank" INTEGER,
  "vectorDistance" DOUBLE PRECISION,
  "keywordRank" INTEGER,
  "fusionScore" DOUBLE PRECISION,
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiMessageCitation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiMessageCitation_sourceLabel_format_check" CHECK ("sourceLabel" ~ '^SOURCE_[1-9][0-9]*$'),
  CONSTRAINT "AiMessageCitation_ranks_positive_check" CHECK (
    ("retrievalRank" IS NULL OR "retrievalRank" > 0)
    AND ("keywordRank" IS NULL OR "keywordRank" > 0)
  )
);

ALTER TABLE "AiChatMessage"
  ADD COLUMN "currentGroundingAttemptId" TEXT;

CREATE UNIQUE INDEX "AiChatMessage_currentGroundingAttemptId_key"
  ON "AiChatMessage"("currentGroundingAttemptId");

CREATE UNIQUE INDEX "AiGroundingAttempt_request_attemptNumber_key"
  ON "AiGroundingAttempt"("generationRequestId", "attemptNumber");

CREATE INDEX "AiGroundingAttempt_assistant_createdAt_id_idx"
  ON "AiGroundingAttempt"("assistantMessageId", "createdAt", "id");

CREATE INDEX "AiGroundingAttempt_embeddingConfigurationId_idx"
  ON "AiGroundingAttempt"("embeddingConfigurationId");

CREATE UNIQUE INDEX "AiMessageCitation_attempt_sourceLabel_key"
  ON "AiMessageCitation"("groundingAttemptId", "sourceLabel");

CREATE UNIQUE INDEX "AiMessageCitation_attempt_chunk_hash_key"
  ON "AiMessageCitation"("groundingAttemptId", "resourceChunkId", "contentHash");

CREATE INDEX "AiMessageCitation_message_createdAt_id_idx"
  ON "AiMessageCitation"("messageId", "createdAt", "id");

CREATE INDEX "AiMessageCitation_resourceId_idx"
  ON "AiMessageCitation"("resourceId");

CREATE INDEX "AiMessageCitation_resourceChunkId_idx"
  ON "AiMessageCitation"("resourceChunkId");

ALTER TABLE "AiGroundingAttempt"
  ADD CONSTRAINT "AiGroundingAttempt_generationRequestId_fkey"
  FOREIGN KEY ("generationRequestId") REFERENCES "AiGenerationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiGroundingAttempt"
  ADD CONSTRAINT "AiGroundingAttempt_assistantMessageId_fkey"
  FOREIGN KEY ("assistantMessageId") REFERENCES "AiChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiGroundingAttempt"
  ADD CONSTRAINT "AiGroundingAttempt_embeddingConfigurationId_fkey"
  FOREIGN KEY ("embeddingConfigurationId") REFERENCES "ResourceEmbeddingConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiChatMessage"
  ADD CONSTRAINT "AiChatMessage_currentGroundingAttemptId_fkey"
  FOREIGN KEY ("currentGroundingAttemptId") REFERENCES "AiGroundingAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiMessageCitation"
  ADD CONSTRAINT "AiMessageCitation_groundingAttemptId_fkey"
  FOREIGN KEY ("groundingAttemptId") REFERENCES "AiGroundingAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiMessageCitation"
  ADD CONSTRAINT "AiMessageCitation_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "AiChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiMessageCitation"
  ADD CONSTRAINT "AiMessageCitation_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiMessageCitation"
  ADD CONSTRAINT "AiMessageCitation_resourceChunkId_fkey"
  FOREIGN KEY ("resourceChunkId") REFERENCES "ResourceChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
