-- Persistent abuse controls must be shared by every serverless instance.
CREATE TABLE "RateLimitBucket" (
    "id" VARCHAR(64) NOT NULL,
    "scope" VARCHAR(96) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiDailyUsage" (
    "userId" TEXT NOT NULL,
    "usageDate" DATE NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiDailyUsage_pkey" PRIMARY KEY ("userId", "usageDate")
);

CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");
CREATE INDEX "AiDailyUsage_usageDate_idx" ON "AiDailyUsage"("usageDate");

ALTER TABLE "AiDailyUsage"
ADD CONSTRAINT "AiDailyUsage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
