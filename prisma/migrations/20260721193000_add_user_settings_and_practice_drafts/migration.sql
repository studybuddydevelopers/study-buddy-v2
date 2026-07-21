-- Add user-level sync/data settings.
CREATE TABLE "UserSettings" (
  "userId" TEXT NOT NULL,
  "cloudPracticeDraftsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "lowDataModeEnabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- Store resumable practice answers without creating submitted attempts.
CREATE TABLE "PracticeAnswerDraft" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "answerText" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PracticeAnswerDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PracticeAnswerDraft_userId_questionId_key"
  ON "PracticeAnswerDraft"("userId", "questionId");

CREATE INDEX "PracticeAnswerDraft_userId_updatedAt_idx"
  ON "PracticeAnswerDraft"("userId", "updatedAt");

ALTER TABLE "UserSettings"
  ADD CONSTRAINT "UserSettings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeAnswerDraft"
  ADD CONSTRAINT "PracticeAnswerDraft_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeAnswerDraft"
  ADD CONSTRAINT "PracticeAnswerDraft_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "PastQuestion"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
