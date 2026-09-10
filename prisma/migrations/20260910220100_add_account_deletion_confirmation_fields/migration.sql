-- Email-confirmed permanent deletion with a one-time token and a 15-day
-- cancellation window after confirmation.
ALTER TABLE "AccountDeletionRequest"
    ALTER COLUMN "status" SET DEFAULT 'AWAITING_CONFIRMATION',
    ALTER COLUMN "scheduledFor" DROP NOT NULL,
    ADD COLUMN "confirmationSentAt" TIMESTAMP(3),
    ADD COLUMN "confirmationTokenHash" VARCHAR(64),
    ADD COLUMN "confirmationTokenExpiresAt" TIMESTAMP(3),
    ADD COLUMN "confirmedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "AccountDeletionRequest_confirmationTokenHash_key"
    ON "AccountDeletionRequest"("confirmationTokenHash");
CREATE INDEX "AccountDeletionRequest_confirmation_expiry_idx"
    ON "AccountDeletionRequest"("confirmationTokenExpiresAt");
