CREATE TYPE "MarkingReviewStatus" AS ENUM ('PENDING', 'UPHELD', 'MARK_ADJUSTED');

CREATE TYPE "MarkingReviewEventType" AS ENUM ('SUBMITTED', 'UPHELD', 'MARK_ADJUSTED');

CREATE TYPE "MarkingReviewActorType" AS ENUM ('LEARNER', 'SUPPORT');

CREATE TABLE "MockExamMarkingReview" (
  "id" TEXT NOT NULL,
  "reference" VARCHAR(32) NOT NULL,
  "userId" TEXT NOT NULL,
  "mockExamInstanceId" TEXT NOT NULL,
  "mockExamAnswerId" TEXT NOT NULL,
  "status" "MarkingReviewStatus" NOT NULL DEFAULT 'PENDING',
  "learnerReason" TEXT NOT NULL,
  "originalScore" INTEGER NOT NULL,
  "revisedScore" INTEGER,
  "maxScore" INTEGER NOT NULL,
  "paperTitleSnapshot" TEXT NOT NULL,
  "subjectNameSnapshot" TEXT NOT NULL,
  "questionReferenceSnapshot" TEXT NOT NULL,
  "questionTextSnapshot" TEXT NOT NULL,
  "learnerAnswerSnapshot" TEXT NOT NULL,
  "modelAnswerSnapshot" TEXT NOT NULL,
  "markingGuideSnapshot" TEXT NOT NULL,
  "aiRationaleSnapshot" TEXT NOT NULL,
  "resolvedByUserId" TEXT,
  "resolutionNote" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MockExamMarkingReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MockExamMarkingReview_scores_check" CHECK (
    "originalScore" >= 0
    AND "maxScore" > 0
    AND "originalScore" <= "maxScore"
    AND ("revisedScore" IS NULL OR ("revisedScore" >= 0 AND "revisedScore" <= "maxScore"))
  )
);

CREATE TABLE "MockExamMarkingReviewEvent" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "eventType" "MarkingReviewEventType" NOT NULL,
  "actorType" "MarkingReviewActorType" NOT NULL,
  "actorUserId" TEXT,
  "previousScore" INTEGER,
  "newScore" INTEGER,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MockExamMarkingReviewEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MockExamMarkingReview_reference_key"
ON "MockExamMarkingReview"("reference");

CREATE UNIQUE INDEX "MockExamMarkingReview_mockExamAnswerId_key"
ON "MockExamMarkingReview"("mockExamAnswerId");

CREATE INDEX "MockExamMarkingReview_user_submitted_idx"
ON "MockExamMarkingReview"("userId", "submittedAt");

CREATE INDEX "MockExamMarkingReview_status_submitted_idx"
ON "MockExamMarkingReview"("status", "submittedAt");

CREATE INDEX "MockExamMarkingReview_instance_idx"
ON "MockExamMarkingReview"("mockExamInstanceId");

CREATE INDEX "MockExamMarkingReviewEvent_review_created_idx"
ON "MockExamMarkingReviewEvent"("reviewId", "createdAt");

ALTER TABLE "MockExamMarkingReview"
ADD CONSTRAINT "MockExamMarkingReview_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MockExamMarkingReview"
ADD CONSTRAINT "MockExamMarkingReview_resolvedByUserId_fkey"
FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MockExamMarkingReview"
ADD CONSTRAINT "MockExamMarkingReview_mockExamInstanceId_fkey"
FOREIGN KEY ("mockExamInstanceId") REFERENCES "MockExamInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MockExamMarkingReview"
ADD CONSTRAINT "MockExamMarkingReview_mockExamAnswerId_fkey"
FOREIGN KEY ("mockExamAnswerId") REFERENCES "MockExamAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MockExamMarkingReviewEvent"
ADD CONSTRAINT "MockExamMarkingReviewEvent_reviewId_fkey"
FOREIGN KEY ("reviewId") REFERENCES "MockExamMarkingReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MockExamMarkingReviewEvent"
ADD CONSTRAINT "MockExamMarkingReviewEvent_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
