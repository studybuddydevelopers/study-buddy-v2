-- AdminUser is the single source of truth for administrative access.
DROP INDEX IF EXISTS "User_isAdmin_createdAt_idx";
ALTER TABLE "User" DROP COLUMN IF EXISTS "isAdmin";

-- Global, distributed AI token circuit breaker. Provider calls reserve an
-- upper bound before execution and settle the provider-reported usage after.
CREATE TABLE "AiGlobalDailyUsage" (
    "usageDate" DATE NOT NULL,
    "reservedTokens" INTEGER NOT NULL DEFAULT 0,
    "consumedTokens" INTEGER NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGlobalDailyUsage_pkey" PRIMARY KEY ("usageDate"),
    CONSTRAINT "AiGlobalDailyUsage_nonnegative_check" CHECK (
        "reservedTokens" >= 0 AND
        "consumedTokens" >= 0 AND
        "requestCount" >= 0
    )
);

-- Prisma connects as the owner and therefore continues to work. Browser-facing
-- Supabase roles receive no direct table access, and RLS makes an accidental
-- future grant deny by default unless an explicit policy is added.
DO $rls$
DECLARE
    target RECORD;
BEGIN
    FOR target IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
            target.tablename
        );
    END LOOP;
END
$rls$;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON FUNCTIONS FROM anon, authenticated;
