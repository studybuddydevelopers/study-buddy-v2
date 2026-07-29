-- Stage 2: admin resource ingestion, extraction, chunking, approval, and legacy past-question migration.
-- This migration intentionally does not add embeddings, pgvector, retrieval, citations, or RAG tables.

CREATE TYPE "ResourceSourceKind" AS ENUM ('UPLOAD', 'LEGACY_PAST_QUESTION');

CREATE TYPE "ResourceProcessingStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED');

CREATE TYPE "ResourceApprovalStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

CREATE TYPE "ResourceExtractionQuality" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'FAILED');

CREATE TYPE "ResourceChunkType" AS ENUM (
  'CONTENT_SECTION',
  'PAST_QUESTION',
  'MARK_SCHEME',
  'WORKED_SOLUTION',
  'SYLLABUS_OBJECTIVE',
  'FORMULA_REFERENCE'
);

CREATE TABLE "Resource" (
  "id" TEXT NOT NULL,
  "sourceKind" "ResourceSourceKind" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "subjectId" TEXT,
  "topicId" TEXT,
  "uploadedById" TEXT,
  "approvedById" TEXT,
  "legacyPastQuestionId" TEXT,
  "storageBucket" TEXT,
  "storagePath" TEXT,
  "originalFileName" TEXT,
  "mimeType" TEXT,
  "byteSize" INTEGER,
  "contentHash" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "processingStatus" "ResourceProcessingStatus" NOT NULL DEFAULT 'UPLOADED',
  "approvalStatus" "ResourceApprovalStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "extractionQuality" "ResourceExtractionQuality",
  "extractionWarnings" JSONB,
  "provenance" TEXT,
  "usageRights" TEXT,
  "duplicateOfResourceId" TEXT,
  "migrationReport" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "processedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "approvalNotes" TEXT,

  CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResourceChunk" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "subjectId" TEXT,
  "topicId" TEXT,
  "chunkType" "ResourceChunkType" NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "title" TEXT,
  "content" TEXT NOT NULL,
  "tokenEstimate" INTEGER NOT NULL,
  "pageStart" INTEGER,
  "pageEnd" INTEGER,
  "questionNumber" TEXT,
  "contentHash" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ResourceChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Resource_legacyPastQuestionId_key" ON "Resource"("legacyPastQuestionId");
CREATE INDEX "Resource_approval_processing_updatedAt_id_idx" ON "Resource"("approvalStatus", "processingStatus", "updatedAt", "id");
CREATE INDEX "Resource_subjectId_topicId_approval_idx" ON "Resource"("subjectId", "topicId", "approvalStatus");
CREATE INDEX "Resource_contentHash_version_idx" ON "Resource"("contentHash", "version");
CREATE INDEX "Resource_sourceKind_updatedAt_id_idx" ON "Resource"("sourceKind", "updatedAt", "id");

CREATE UNIQUE INDEX "ResourceChunk_resourceId_chunkIndex_key" ON "ResourceChunk"("resourceId", "chunkIndex");
CREATE INDEX "ResourceChunk_resourceId_chunkType_chunkIndex_idx" ON "ResourceChunk"("resourceId", "chunkType", "chunkIndex");
CREATE INDEX "ResourceChunk_subjectId_topicId_chunkType_idx" ON "ResourceChunk"("subjectId", "topicId", "chunkType");
CREATE INDEX "ResourceChunk_contentHash_idx" ON "ResourceChunk"("contentHash");

ALTER TABLE "Resource"
  ADD CONSTRAINT "Resource_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resource"
  ADD CONSTRAINT "Resource_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resource"
  ADD CONSTRAINT "Resource_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resource"
  ADD CONSTRAINT "Resource_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resource"
  ADD CONSTRAINT "Resource_legacyPastQuestionId_fkey"
  FOREIGN KEY ("legacyPastQuestionId") REFERENCES "PastQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resource"
  ADD CONSTRAINT "Resource_duplicateOfResourceId_fkey"
  FOREIGN KEY ("duplicateOfResourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResourceChunk"
  ADD CONSTRAINT "ResourceChunk_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResourceChunk"
  ADD CONSTRAINT "ResourceChunk_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ResourceChunk"
  ADD CONSTRAINT "ResourceChunk_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
