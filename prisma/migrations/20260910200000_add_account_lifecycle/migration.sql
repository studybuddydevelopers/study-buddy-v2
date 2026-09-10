-- Reversible account deactivation and retryable permanent deletion.
ALTER TYPE "AccountStatus" ADD VALUE IF NOT EXISTS 'DEACTIVATED';
ALTER TYPE "AccountStatus" ADD VALUE IF NOT EXISTS 'DELETION_PENDING';

CREATE TYPE "AccountDeletionRequestStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'CANCELLED',
    'FAILED'
);

ALTER TABLE "User" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

CREATE TABLE "AccountDeletionRequest" (
    "id" UUID NOT NULL,
    "userId" TEXT,
    "authUserId" TEXT,
    "accountFingerprint" VARCHAR(64) NOT NULL,
    "status" "AccountDeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "processingStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailureCode" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AccountDeletionRequest_attemptCount_check" CHECK ("attemptCount" >= 0)
);

CREATE UNIQUE INDEX "AccountDeletionRequest_userId_key"
    ON "AccountDeletionRequest"("userId");
CREATE UNIQUE INDEX "AccountDeletionRequest_authUserId_key"
    ON "AccountDeletionRequest"("authUserId");
CREATE INDEX "AccountDeletionRequest_status_scheduled_idx"
    ON "AccountDeletionRequest"("status", "scheduledFor");

ALTER TABLE "AccountDeletionRequest"
    ADD CONSTRAINT "AccountDeletionRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Payment evidence may have a separate statutory retention obligation. Keep
-- the transaction but remove its link to the person when the account is purged.
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_userId_fkey";
ALTER TABLE "Transaction" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Transaction"
    ADD CONSTRAINT "Transaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Match the public-schema hardening baseline. The migration owner's configured
-- default privileges must grant the dedicated server runtime role CRUD access.
ALTER TABLE "AccountDeletionRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "AccountDeletionRequest" FROM anon, authenticated;

