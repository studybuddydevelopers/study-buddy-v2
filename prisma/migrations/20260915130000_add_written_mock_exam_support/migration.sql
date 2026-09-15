CREATE TYPE "MockExamFormat" AS ENUM ('OBJECTIVE', 'WRITTEN');

CREATE TYPE "MockExamSection" AS ENUM ('OBJECTIVE', 'PART_I', 'PART_II');

ALTER TABLE "MockExamTemplate"
ADD COLUMN "format" "MockExamFormat" NOT NULL DEFAULT 'OBJECTIVE',
ADD COLUMN "durationMinutes" INTEGER,
ADD COLUMN "totalMarks" INTEGER,
ADD COLUMN "requiredQuestionCount" INTEGER;

ALTER TABLE "MockExamAnswer"
ADD COLUMN "section" "MockExamSection" NOT NULL DEFAULT 'OBJECTIVE',
ADD COLUMN "displayOrder" INTEGER,
ADD COLUMN "maxScore" INTEGER NOT NULL DEFAULT 1;

UPDATE "MockExamTemplate"
SET
  "durationMinutes" = CASE
    WHEN "questionCount" = 50 THEN 90
    ELSE NULL
  END,
  "totalMarks" = "questionCount",
  "requiredQuestionCount" = "questionCount";
