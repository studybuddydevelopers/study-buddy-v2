CREATE TABLE "SecurityAuditEvent" (
    "id" BIGSERIAL NOT NULL,
    "event" VARCHAR(96) NOT NULL,
    "level" VARCHAR(16) NOT NULL,
    "details" JSONB,
    "environment" VARCHAR(64),
    "service" VARCHAR(96),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SecurityAuditEvent_level_check"
        CHECK ("level" IN ('info', 'warn', 'error'))
);

CREATE TABLE "SecurityOperationsEvidence" (
    "evidenceType" VARCHAR(64) NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "reviewedBy" VARCHAR(160),
    "reference" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityOperationsEvidence_pkey" PRIMARY KEY ("evidenceType"),
    CONSTRAINT "SecurityOperationsEvidence_type_check"
        CHECK ("evidenceType" IN ('BACKUP_RESTORE_TEST', 'PROVIDER_ACCESS_REVIEW'))
);

CREATE TABLE "SecurityOperationsReportRun" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "recipients" TEXT[] NOT NULL,
    "summary" JSONB,
    "sentAt" TIMESTAMP(3),
    "failureCode" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityOperationsReportRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SecurityOperationsReportRun_status_check"
        CHECK ("status" IN ('RUNNING', 'SENT', 'FAILED')),
    CONSTRAINT "SecurityOperationsReportRun_period_check"
        CHECK ("periodEnd" > "periodStart")
);

CREATE INDEX "SecurityAuditEvent_createdAt_idx"
ON "SecurityAuditEvent"("createdAt");

CREATE INDEX "SecurityAuditEvent_event_level_createdAt_idx"
ON "SecurityAuditEvent"("event", "level", "createdAt");

CREATE INDEX "SecurityOperationsReportRun_status_createdAt_idx"
ON "SecurityOperationsReportRun"("status", "createdAt");

CREATE UNIQUE INDEX "SecurityOperationsReportRun_period_key"
ON "SecurityOperationsReportRun"("periodStart", "periodEnd");

ALTER TABLE "SecurityAuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityOperationsEvidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityOperationsReportRun" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE "SecurityAuditEvent" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE "SecurityOperationsEvidence" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE "SecurityOperationsReportRun" FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON SEQUENCE "SecurityAuditEvent_id_seq" FROM anon, authenticated;
