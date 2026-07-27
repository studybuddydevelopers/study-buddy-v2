-- Stage 1 persistent general AI chat.
-- Legacy AiQuestion/AiQuestionMessage tables are intentionally unchanged.

CREATE TYPE "AiChatRole" AS ENUM ('USER', 'ASSISTANT');

CREATE TYPE "AiChatMessageStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

CREATE TYPE "AiGenerationRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

CREATE TYPE "AiGenerationFailureCode" AS ENUM (
  'PROVIDER_TIMEOUT',
  'RATE_LIMITED',
  'PROVIDER_ERROR',
  'INVALID_PROVIDER_RESPONSE',
  'INTERNAL_ERROR'
);

CREATE TABLE "AiChat" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subjectId" TEXT,
  "topicId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "AiChat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiChatMessage" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "role" "AiChatRole" NOT NULL,
  "content" TEXT NOT NULL,
  "status" "AiChatMessageStatus" NOT NULL DEFAULT 'COMPLETED',
  "failureCode" "AiGenerationFailureCode",
  "modelProvider" TEXT,
  "modelName" TEXT,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiGenerationRequest" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "clientRequestId" TEXT NOT NULL,
  "userMessageId" TEXT NOT NULL,
  "assistantMessageId" TEXT NOT NULL,
  "status" "AiGenerationRequestStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "failureCode" "AiGenerationFailureCode",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "AiGenerationRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiGenerationRequest_userMessageId_key" ON "AiGenerationRequest"("userMessageId");

CREATE UNIQUE INDEX "AiGenerationRequest_assistantMessageId_key" ON "AiGenerationRequest"("assistantMessageId");

CREATE UNIQUE INDEX "AiGenerationRequest_chatId_clientRequestId_key" ON "AiGenerationRequest"("chatId", "clientRequestId");

CREATE INDEX "AiChat_userId_deletedAt_updatedAt_id_idx" ON "AiChat"("userId", "deletedAt", "updatedAt", "id");

CREATE INDEX "AiChat_id_userId_deletedAt_idx" ON "AiChat"("id", "userId", "deletedAt");

CREATE INDEX "AiChatMessage_chatId_createdAt_id_idx" ON "AiChatMessage"("chatId", "createdAt", "id");

CREATE INDEX "AiGenerationRequest_chatId_status_updatedAt_idx" ON "AiGenerationRequest"("chatId", "status", "updatedAt");

ALTER TABLE "AiChat"
  ADD CONSTRAINT "AiChat_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiChat"
  ADD CONSTRAINT "AiChat_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiChat"
  ADD CONSTRAINT "AiChat_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiChatMessage"
  ADD CONSTRAINT "AiChatMessage_chatId_fkey"
  FOREIGN KEY ("chatId") REFERENCES "AiChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiGenerationRequest"
  ADD CONSTRAINT "AiGenerationRequest_chatId_fkey"
  FOREIGN KEY ("chatId") REFERENCES "AiChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiGenerationRequest"
  ADD CONSTRAINT "AiGenerationRequest_userMessageId_fkey"
  FOREIGN KEY ("userMessageId") REFERENCES "AiChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiGenerationRequest"
  ADD CONSTRAINT "AiGenerationRequest_assistantMessageId_fkey"
  FOREIGN KEY ("assistantMessageId") REFERENCES "AiChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
