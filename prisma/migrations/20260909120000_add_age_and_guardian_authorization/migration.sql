CREATE TYPE "AccountStatus" AS ENUM (
    'AGE_VERIFICATION_REQUIRED',
    'BELOW_MINIMUM_AGE',
    'GUARDIAN_AUTHORIZATION_REQUIRED',
    'ACTIVE',
    'GUARDIAN_AUTHORIZATION_DENIED'
);

CREATE TYPE "GuardianRelationship" AS ENUM ('PARENT', 'LEGAL_GUARDIAN');

CREATE TYPE "GuardianAuthorizationStatus" AS ENUM (
    'PENDING',
    'GRANTED',
    'DENIED',
    'WITHDRAWN',
    'EXPIRED',
    'SUPERSEDED'
);

CREATE TYPE "GuardianAuthorizationEventType" AS ENUM (
    'REQUESTED',
    'GRANTED',
    'DENIED',
    'WITHDRAWN',
    'EXPIRED',
    'SUPERSEDED'
);

ALTER TABLE "User"
    ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'AGE_VERIFICATION_REQUIRED',
    ADD COLUMN "aiAccessAuthorized" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
    ADD COLUMN "termsVersion" VARCHAR(32);

ALTER TABLE "UserProfile" ADD COLUMN "dateOfBirth" DATE;

CREATE TABLE "GuardianAuthorization" (
    "id" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "studentEmail" VARCHAR(320) NOT NULL,
    "guardianName" VARCHAR(160) NOT NULL,
    "guardianEmail" VARCHAR(320) NOT NULL,
    "relationship" "GuardianRelationship" NOT NULL,
    "status" "GuardianAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
    "tokenHash" VARCHAR(64) NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "noticeVersion" VARCHAR(32) NOT NULL,
    "termsVersion" VARCHAR(32) NOT NULL,
    "verificationMethod" VARCHAR(64) NOT NULL DEFAULT 'EMAIL_LINK_DECLARATION',
    "aiAuthorized" BOOLEAN,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuardianAuthorization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuardianAuthorizationEvent" (
    "id" TEXT NOT NULL,
    "authorizationId" TEXT NOT NULL,
    "eventType" "GuardianAuthorizationEventType" NOT NULL,
    "actorType" VARCHAR(32) NOT NULL,
    "ipFingerprint" VARCHAR(64),
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianAuthorizationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuardianAuthorization_tokenHash_key"
    ON "GuardianAuthorization"("tokenHash");
CREATE INDEX "GuardianAuthorization_student_status_idx"
    ON "GuardianAuthorization"("studentUserId", "status", "createdAt");
CREATE INDEX "GuardianAuthorization_guardian_status_idx"
    ON "GuardianAuthorization"("guardianEmail", "status");
CREATE INDEX "GuardianAuthorization_token_expiry_idx"
    ON "GuardianAuthorization"("tokenExpiresAt");
CREATE INDEX "GuardianAuthorizationEvent_authorization_created_idx"
    ON "GuardianAuthorizationEvent"("authorizationId", "createdAt");

ALTER TABLE "GuardianAuthorization"
    ADD CONSTRAINT "GuardianAuthorization_studentUserId_fkey"
    FOREIGN KEY ("studentUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuardianAuthorizationEvent"
    ADD CONSTRAINT "GuardianAuthorizationEvent_authorizationId_fkey"
    FOREIGN KEY ("authorizationId") REFERENCES "GuardianAuthorization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuardianAuthorization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GuardianAuthorizationEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON "GuardianAuthorization" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON "GuardianAuthorizationEvent" FROM anon, authenticated;
