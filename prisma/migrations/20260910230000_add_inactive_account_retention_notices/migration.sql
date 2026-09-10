-- Track the four approved inactivity-expiry notices and make due-account
-- selection efficient. Notice timestamps are reset on each new deactivation.
ALTER TABLE "User"
    ADD COLUMN "inactiveDeletionAt" TIMESTAMP(3),
    ADD COLUMN "inactiveWarning90SentAt" TIMESTAMP(3),
    ADD COLUMN "inactiveWarning60SentAt" TIMESTAMP(3),
    ADD COLUMN "inactiveWarning15SentAt" TIMESTAMP(3),
    ADD COLUMN "inactiveWarning1SentAt" TIMESTAMP(3);

UPDATE "User"
SET "inactiveDeletionAt" = "deactivatedAt" + INTERVAL '36 months'
WHERE "accountStatus" = 'DEACTIVATED' AND "deactivatedAt" IS NOT NULL;

CREATE INDEX "User_accountStatus_inactiveDeletionAt_idx"
    ON "User"("accountStatus", "inactiveDeletionAt");

-- Inactivity expiry is not a user-confirmed deletion request and cannot be
-- cancelled through the permanent-deletion cancellation endpoint.
ALTER TABLE "AccountDeletionRequest"
    ADD COLUMN "retentionTriggeredAt" TIMESTAMP(3);
