-- CreateTable
CREATE TABLE "PracticeQuizSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSeconds" INTEGER,
    "totalQuestions" INTEGER NOT NULL,
    "answeredQuestions" INTEGER NOT NULL,
    "submittedQuestions" INTEGER NOT NULL,
    "correctQuestions" INTEGER NOT NULL,
    "wrongQuestions" INTEGER NOT NULL,

    CONSTRAINT "PracticeQuizSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeQuizAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "isCorrect" BOOLEAN,
    "answeredAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeQuizAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeQuizSession_userId_finishedAt_idx" ON "PracticeQuizSession"("userId", "finishedAt");

-- CreateIndex
CREATE INDEX "PracticeQuizSession_topicId_finishedAt_idx" ON "PracticeQuizSession"("topicId", "finishedAt");

-- CreateIndex
CREATE INDEX "PracticeQuizAnswer_questionId_idx" ON "PracticeQuizAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeQuizAnswer_sessionId_questionId_key" ON "PracticeQuizAnswer"("sessionId", "questionId");

-- AddForeignKey
ALTER TABLE "PracticeQuizSession" ADD CONSTRAINT "PracticeQuizSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeQuizSession" ADD CONSTRAINT "PracticeQuizSession_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeQuizAnswer" ADD CONSTRAINT "PracticeQuizAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeQuizSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeQuizAnswer" ADD CONSTRAINT "PracticeQuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PastQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
