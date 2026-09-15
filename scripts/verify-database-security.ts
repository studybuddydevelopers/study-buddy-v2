import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface SecurityCheck {
  tables: number;
  rlsTables: number;
  browserCrudGrants: number;
  adminAuthorityArtifacts: number;
  aiBudgetTable: boolean;
  passwordResetSecurityRuntimeCrud: boolean;
  securityOperationsRuntimeAccess: boolean;
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
        (
          SELECT count(*)::int
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'User'
            AND column_name = 'isAdmin'
        ) + CASE
          WHEN to_regclass('public."AdminUser"') IS NULL THEN 0
          ELSE 1
        END
      ) AS "adminAuthorityArtifacts",
      to_regclass('public."AiGlobalDailyUsage"') IS NOT NULL AS "aiBudgetTable",
      has_table_privilege(
        current_user,
        'public."PasswordResetSecurityState"',
        'SELECT,INSERT,UPDATE,DELETE'
      ) AND has_table_privilege(
        current_user,
        'public."PasswordResetSecurityEvent"',
        'SELECT,INSERT,UPDATE,DELETE'
      ) AS "passwordResetSecurityRuntimeCrud",
      has_table_privilege(
        current_user,
        'public."SecurityAuditEvent"',
        'SELECT,INSERT,UPDATE,DELETE'
      ) AND has_table_privilege(
        current_user,
        'public."SecurityOperationsEvidence"',
        'SELECT,INSERT,UPDATE,DELETE'
      ) AND has_table_privilege(
        current_user,
        'public."SecurityOperationsReportRun"',
        'SELECT,INSERT,UPDATE,DELETE'
      ) AND has_sequence_privilege(
        current_user,
        'public."SecurityAuditEvent_id_seq"',
        'USAGE,SELECT,UPDATE'
      ) AS "securityOperationsRuntimeAccess"
  `);

  if (
    !check ||
    check.tables !== check.rlsTables ||
    check.browserCrudGrants !== 0 ||
    check.adminAuthorityArtifacts !== 0 ||
    !check.aiBudgetTable ||
    !check.passwordResetSecurityRuntimeCrud ||
    !check.securityOperationsRuntimeAccess
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
