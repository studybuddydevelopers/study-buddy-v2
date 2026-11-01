CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notification_reviewId_key" ON "Notification"("reviewId");
CREATE INDEX "Notification_userId_createdAt_id_idx" ON "Notification"("userId", "createdAt", "id");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "MockExamMarkingReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Only the server-side Prisma role may access these records. Never expose
-- another learner's review decisions through Supabase's browser-facing API.
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "Notification" FROM anon, authenticated;
