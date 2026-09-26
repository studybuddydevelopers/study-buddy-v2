-- Add source column to PastQuestion for placeholder-tagging.
-- Phase 2 clean-swap: DELETE FROM "PastQuestion" WHERE source = 'placeholder'
ALTER TABLE "PastQuestion" ADD COLUMN "source" VARCHAR(64);

-- Back-fill all existing rows as placeholder (all current content is seeded/synthetic).
UPDATE "PastQuestion" SET "source" = 'placeholder' WHERE "source" IS NULL;
