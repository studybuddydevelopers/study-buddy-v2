-- Password-reset abuse alerts and an explicit, user-confirmed temporary lock.
-- Raw account emails and bearer tokens are not stored in these tables.
CREATE TYPE "PasswordResetSecurityEventType" AS ENUM (
    'ALERT_REQUESTED',
    'ALERT_SENT',
    'ALERT_SUPPRESSED',
    'ALERT_DELIVERY_FAILED',
    'LOCK_CONFIRMED',
    'AUTH_LOCK_APPLIED',
    'AUTH_LOCK_FAILED',
    'LOCK_EXPIRED',
    'RECOVERY_REQUESTED',
    'RECOVERY_EMAIL_SENT',
    'RECOVERY_FAILED',
    'UNLOCKED'
);

ALTER TABLE "User"
    ADD COLUMN "authEmailFingerprint" VARCHAR(64);

CREATE UNIQUE INDEX "User_authEmailFingerprint_key"
    ON "User"("authEmailFingerprint");

CREATE TABLE "PasswordResetSecurityState" (
    "userId" TEXT NOT NULL,
    "lastAlertAttemptAt" TIMESTAMP(3),
    "lastAlertSentAt" TIMESTAMP(3),
    "alertDay" DATE,
    "alertCount" INTEGER NOT NULL DEFAULT 0,
    "lockTokenHash" VARCHAR(64),
    "lockTokenExpiresAt" TIMESTAMP(3),
    "lockTokenUsedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lockExpiryRecordedAt" TIMESTAMP(3),
    "authLockAppliedAt" TIMESTAMP(3),
    "recoveryTokenHash" VARCHAR(64),
    "recoveryTokenExpiresAt" TIMESTAMP(3),
    "recoveryTokenUsedAt" TIMESTAMP(3),
    "recoveryStartedAt" TIMESTAMP(3),
    "recoveryCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetSecurityState_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "PasswordResetSecurityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "PasswordResetSecurityEventType" NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetSecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetSecurityState_lockTokenHash_key"
    ON "PasswordResetSecurityState"("lockTokenHash");
CREATE UNIQUE INDEX "PasswordResetSecurityState_recoveryTokenHash_key"
    ON "PasswordResetSecurityState"("recoveryTokenHash");
CREATE INDEX "PasswordResetSecurityState_lockedUntil_idx"
    ON "PasswordResetSecurityState"("lockedUntil");
CREATE INDEX "PasswordResetSecurityState_recoveryTokenExpiry_idx"
    ON "PasswordResetSecurityState"("recoveryTokenExpiresAt");
CREATE INDEX "PasswordResetSecurityEvent_user_created_idx"
    ON "PasswordResetSecurityEvent"("userId", "createdAt");

ALTER TABLE "PasswordResetSecurityState"
    ADD CONSTRAINT "PasswordResetSecurityState_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasswordResetSecurityEvent"
    ADD CONSTRAINT "PasswordResetSecurityEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasswordResetSecurityState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetSecurityEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "PasswordResetSecurityState" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE "PasswordResetSecurityEvent" FROM anon, authenticated;
