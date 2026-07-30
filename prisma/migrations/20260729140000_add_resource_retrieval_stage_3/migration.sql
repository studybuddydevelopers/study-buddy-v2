-- Stage 3: versioned embeddings, exact vector search support, and chunk full-text search.
-- This migration intentionally does not add RAG prompts, citations, tutor modes, or chat integration.
-- Supabase metadata was inspected before creating this migration:
--   - schema "extensions" exists
--   - extension "vector" is available but not installed
--   - extension "pg_trgm" is available but intentionally not installed in Stage 3

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TYPE "ResourceEmbeddingConfigurationStatus" AS ENUM (
  'BUILDING',
  'READY',
  'ACTIVE',
  'RETIRED',
  'FAILED'
);

CREATE TYPE "ResourceChunkEmbeddingStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE "ResourceChunkEmbeddingFailureCode" AS ENUM (
  'PROVIDER_TIMEOUT',
  'RATE_LIMITED',
  'PROVIDER_ERROR',
  'INVALID_PROVIDER_RESPONSE',
  'DIMENSION_MISMATCH',
  'INTERNAL_ERROR'
);

ALTER TABLE "ResourceChunk"
  ADD COLUMN "searchText" TEXT,
  ADD COLUMN "searchVector" tsvector
    GENERATED ALWAYS AS (
      to_tsvector('simple'::regconfig, COALESCE("searchText", ''::text))
    ) STORED;

CREATE INDEX "ResourceChunk_searchVector_idx"
  ON "ResourceChunk" USING GIN ("searchVector");

UPDATE "ResourceChunk" AS c
SET "searchText" = array_to_string(
  ARRAY_REMOVE(ARRAY[
    r."title",
    r."description",
    r."sourceKind"::text,
    c."title",
    c."chunkType"::text,
    CASE WHEN c."questionNumber" IS NOT NULL THEN 'Question ' || c."questionNumber" ELSE NULL END,
    c."content",
    c."metadata"::text
  ], NULL),
  E'\n'
)
FROM "Resource" AS r
WHERE c."resourceId" = r."id"
  AND c."searchText" IS NULL;

CREATE TABLE "ResourceEmbeddingConfiguration" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "dimensions" INTEGER NOT NULL,
  "embeddingVersion" INTEGER NOT NULL DEFAULT 1,
  "status" "ResourceEmbeddingConfigurationStatus" NOT NULL DEFAULT 'BUILDING',
  "eligibleChunkCount" INTEGER NOT NULL DEFAULT 0,
  "completedChunkCount" INTEGER NOT NULL DEFAULT 0,
  "failedChunkCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "activatedAt" TIMESTAMP(3),
  "retiredAt" TIMESTAMP(3),

  CONSTRAINT "ResourceEmbeddingConfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResourceEmbeddingConfiguration_dimensions_1536_check" CHECK ("dimensions" = 1536),
  CONSTRAINT "ResourceEmbeddingConfiguration_embeddingVersion_positive_check" CHECK ("embeddingVersion" > 0),
  CONSTRAINT "ResourceEmbeddingConfiguration_counts_non_negative_check" CHECK (
    "eligibleChunkCount" >= 0
    AND "completedChunkCount" >= 0
    AND "failedChunkCount" >= 0
  )
);

CREATE TABLE "ResourceChunkEmbedding" (
  "id" TEXT NOT NULL,
  "resourceChunkId" TEXT NOT NULL,
  "configurationId" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "status" "ResourceChunkEmbeddingStatus" NOT NULL DEFAULT 'PENDING',
  "failureCode" "ResourceChunkEmbeddingFailureCode",
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "leasedUntil" TIMESTAMP(3),
  "embedding" extensions.vector(1536),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "ResourceChunkEmbedding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResourceChunkEmbedding_attemptCount_non_negative_check" CHECK ("attemptCount" >= 0),
  CONSTRAINT "ResourceChunkEmbedding_completed_embedding_check" CHECK (
    ("status" = 'COMPLETED' AND "embedding" IS NOT NULL AND "completedAt" IS NOT NULL AND "failureCode" IS NULL)
    OR ("status" = 'PENDING' AND "completedAt" IS NULL AND "failureCode" IS NULL)
    OR ("status" = 'FAILED' AND "completedAt" IS NULL AND "failureCode" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "ResourceEmbeddingConfig_provider_model_dim_ver_key"
  ON "ResourceEmbeddingConfiguration"("provider", "model", "dimensions", "embeddingVersion");

CREATE INDEX "ResourceEmbeddingConfig_status_provider_model_idx"
  ON "ResourceEmbeddingConfiguration"("status", "provider", "model", "dimensions", "embeddingVersion");

CREATE UNIQUE INDEX "ResourceEmbeddingConfiguration_single_active_idx"
  ON "ResourceEmbeddingConfiguration"("status")
  WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "ResourceChunkEmbedding_chunk_config_hash_key"
  ON "ResourceChunkEmbedding"("resourceChunkId", "configurationId", "contentHash");

CREATE INDEX "ResourceChunkEmbedding_config_status_lease_idx"
  ON "ResourceChunkEmbedding"("configurationId", "status", "leasedUntil", "updatedAt", "id");

CREATE INDEX "ResourceChunkEmbedding_chunk_config_status_idx"
  ON "ResourceChunkEmbedding"("resourceChunkId", "configurationId", "status");

CREATE INDEX "ResourceChunkEmbedding_contentHash_idx"
  ON "ResourceChunkEmbedding"("contentHash");

ALTER TABLE "ResourceChunkEmbedding"
  ADD CONSTRAINT "ResourceChunkEmbedding_resourceChunkId_fkey"
  FOREIGN KEY ("resourceChunkId") REFERENCES "ResourceChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResourceChunkEmbedding"
  ADD CONSTRAINT "ResourceChunkEmbedding_configurationId_fkey"
  FOREIGN KEY ("configurationId") REFERENCES "ResourceEmbeddingConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
