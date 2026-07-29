-- Stage 2 acceptance fix: preserve previous active chunks while replacement chunks are processed.
-- This does not add embeddings, pgvector, retrieval, citations, RAG, or tutor modes.

ALTER TABLE "Resource"
  ADD COLUMN "activeChunkVersion" INTEGER,
  ADD COLUMN "activeChunkSetHash" TEXT,
  ADD COLUMN "processingVersion" INTEGER;

ALTER TABLE "ResourceChunk"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

DROP INDEX IF EXISTS "ResourceChunk_resourceId_chunkIndex_key";
DROP INDEX IF EXISTS "ResourceChunk_resourceId_chunkType_chunkIndex_idx";

CREATE INDEX "Resource_activeChunkVersion_idx" ON "Resource"("activeChunkVersion");
CREATE UNIQUE INDEX "ResourceChunk_resourceId_version_chunkIndex_key" ON "ResourceChunk"("resourceId", "version", "chunkIndex");
CREATE INDEX "ResourceChunk_resourceId_version_chunkType_chunkIndex_idx" ON "ResourceChunk"("resourceId", "version", "chunkType", "chunkIndex");
