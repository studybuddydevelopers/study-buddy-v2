-- Query-performance indexes for dashboard/progress, practice materials,
-- AI tutor threads, mock exams, subscription lists, schools, and payments.

-- Backfill default settings for users created before UserSettings was introduced.
INSERT INTO "UserSettings" (
  "userId",
  "cloudPracticeDraftsEnabled",
  "lowDataModeEnabled",
  "updatedAt"
)
SELECT
  id,
  false,
  false,
  CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("userId") DO NOTHING;

CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "User_isAdmin_createdAt_idx" ON "User"("isAdmin", "createdAt");

CREATE INDEX "Subject_examCode_idx" ON "Subject"("examCode");
CREATE INDEX "Topic_subjectId_sortOrder_title_idx" ON "Topic"("subjectId", "sortOrder", "title");

CREATE INDEX "PastQuestion_topicId_difficulty_id_idx" ON "PastQuestion"("topicId", "difficulty", "id");
CREATE INDEX "PastQuestion_subjectId_id_idx" ON "PastQuestion"("subjectId", "id");

CREATE INDEX "PastQuestionAttempt_userId_attemptedAt_idx" ON "PastQuestionAttempt"("userId", "attemptedAt");
CREATE INDEX "PastQuestionAttempt_userId_questionId_attemptedAt_idx" ON "PastQuestionAttempt"("userId", "questionId", "attemptedAt");

CREATE INDEX "AiQuestion_userId_createdAt_idx" ON "AiQuestion"("userId", "createdAt");
CREATE INDEX "AiQuestionMessage_aiQuestionId_createdAt_idx" ON "AiQuestionMessage"("aiQuestionId", "createdAt");

CREATE INDEX "MockExamTemplate_subjectId_idx" ON "MockExamTemplate"("subjectId");
CREATE INDEX "MockExamInstance_userId_graded_submittedAt_startedAt_idx" ON "MockExamInstance"("userId", "graded", "submittedAt", "startedAt");
CREATE INDEX "MockExamAnswer_mockExamInstanceId_idx" ON "MockExamAnswer"("mockExamInstanceId");

CREATE INDEX "Recommendation_userId_createdAt_idx" ON "Recommendation"("userId", "createdAt");
CREATE UNIQUE INDEX "ProgressTrack_userId_subjectId_key" ON "ProgressTrack"("userId", "subjectId");

CREATE INDEX "Subscription_userId_startDate_idx" ON "Subscription"("userId", "startDate");
CREATE INDEX "Subscription_status_plan_startDate_idx" ON "Subscription"("status", "plan", "startDate");

CREATE INDEX "School_name_idx" ON "School"("name");
CREATE INDEX "SchoolStudent_schoolId_joinedAt_idx" ON "SchoolStudent"("schoolId", "joinedAt");

CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");
