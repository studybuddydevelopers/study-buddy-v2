CREATE TYPE "AiMessageReportStatus" AS ENUM ('OPEN', 'REVIEWED');

CREATE TABLE "AiChatMessageReport" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reason" VARCHAR(32) NOT NULL,
  "details" VARCHAR(2000) NOT NULL,
  "status" "AiMessageReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "resolutionNote" VARCHAR(2000),
  CONSTRAINT "AiChatMessageReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiChatMessageReport_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AiChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiChatMessageReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiChatMessageReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AiChatMessageReport_messageId_key" ON "AiChatMessageReport"("messageId");
CREATE INDEX "AiChatMessageReport_status_createdAt_id_idx" ON "AiChatMessageReport"("status", "createdAt", "id");
CREATE INDEX "AiChatMessageReport_userId_createdAt_idx" ON "AiChatMessageReport"("userId", "createdAt");

ALTER TABLE "AiChatMessageReport" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "AiChatMessageReport" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE "AiChatMessageReport" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE "AiChatMessageReport" FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'studybuddy_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AiChatMessageReport" TO studybuddy_runtime;
  END IF;
END;
$$;
