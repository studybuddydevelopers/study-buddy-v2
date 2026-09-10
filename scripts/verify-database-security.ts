import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface SecurityCheck {
  tables: number;
  rlsTables: number;
  browserCrudGrants: number;
  legacyAdminColumns: number;
  aiBudgetTable: boolean;
}

async function main() {
  const [check] = await prisma.$queryRaw<SecurityCheck[]>(Prisma.sql`
    SELECT
      (
        SELECT count(*)::int
        FROM pg_tables
        WHERE schemaname = 'public'
      ) AS "tables",
      (
        SELECT count(*)::int
        FROM pg_tables AS tables
        JOIN pg_class AS classes
          ON classes.relname = tables.tablename
        JOIN pg_namespace AS namespaces
          ON namespaces.oid = classes.relnamespace
          AND namespaces.nspname = tables.schemaname
        WHERE tables.schemaname = 'public'
          AND classes.relrowsecurity
      ) AS "rlsTables",
      (
        SELECT count(*)::int
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public'
          AND grantee IN ('anon', 'authenticated')
          AND privilege_type IN (
            'SELECT', 'INSERT', 'UPDATE', 'DELETE',
            'TRUNCATE', 'REFERENCES', 'TRIGGER'
          )
      ) AS "browserCrudGrants",
      (
        SELECT count(*)::int
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'User'
          AND column_name = 'isAdmin'
      ) AS "legacyAdminColumns",
      to_regclass('public."AiGlobalDailyUsage"') IS NOT NULL AS "aiBudgetTable"
  `);

  if (
    !check ||
    check.tables !== check.rlsTables ||
    check.browserCrudGrants !== 0 ||
    check.legacyAdminColumns !== 0 ||
    !check.aiBudgetTable
  ) {
    throw new Error(
      `Database security assertions failed: ${JSON.stringify(check)}`
    );
  }

  console.info(JSON.stringify(check));
}

main()
  .catch((error: unknown) => {
    const safeMessage =
      error instanceof Error ? error.message : "Unknown verification error.";
    console.error(`Database security verification failed: ${safeMessage}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
