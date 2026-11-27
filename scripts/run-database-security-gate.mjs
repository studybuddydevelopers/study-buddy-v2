import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import pg from "pg";
import {
  E2E_USER,
  validateE2eDatabaseUrl,
} from "./prepare-e2e-database.mjs";

const RUNTIME_ROLE = "studybuddy_runtime";
const RUNTIME_PASSWORD = "database-security-e2e-runtime-password-123456";
const EXPECTED_INDEXES = Object.freeze([
  "AiChatMessageReport_status_createdAt_id_idx",
  "RateLimitBucket_expiresAt_idx",
  "ResourceChunk_searchVector_idx",
  "User_createdAt_idx",
]);

export function resolveDatabaseSecurityConfig(value) {
  const { url, databaseName } = validateE2eDatabaseUrl(value);
  if (databaseName.endsWith("_shadow_e2e")) {
    throw new Error("The primary disposable database cannot be a shadow database.");
  }

  const shadowDatabaseName = databaseName.replace(/_e2e$/i, "_shadow_e2e");
  const shadowUrl = new URL(url);
  shadowUrl.pathname = `/${shadowDatabaseName}`;
  shadowUrl.searchParams.delete("schema");

  const runtimeUrl = new URL(url);
  runtimeUrl.username = RUNTIME_ROLE;
  runtimeUrl.password = RUNTIME_PASSWORD;
  runtimeUrl.searchParams.delete("schema");

  const maintenanceUrl = new URL(url);
  maintenanceUrl.pathname = "/postgres";
  maintenanceUrl.searchParams.delete("schema");

  return {
    databaseName,
    databaseUrl: url.toString(),
    maintenanceUrl: maintenanceUrl.toString(),
    runtimeUrl: runtimeUrl.toString(),
    shadowDatabaseName,
    shadowUrl: shadowUrl.toString(),
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...options.env },
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (options.capture && result.stdout) process.stdout.write(result.stdout);
    if (options.capture && result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${options.label ?? command} failed with exit code ${result.status}.`);
  }

  return result;
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function npxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function psqlCommand() {
  return process.platform === "win32" ? "psql.exe" : "psql";
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function resetDisposableState(config) {
  const client = new pg.Client({ connectionString: config.maintenanceUrl });
  await client.connect();
  try {
    await client.query(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(config.databaseName)} WITH (FORCE)`
    );
    await client.query(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(config.shadowDatabaseName)} WITH (FORCE)`
    );
    await client.query(`REVOKE ALL PRIVILEGES ON DATABASE postgres FROM ${RUNTIME_ROLE}`).catch(
      (error) => {
        if (error?.code !== "42704") throw error;
      }
    );
    await client.query(`DROP ROLE IF EXISTS ${RUNTIME_ROLE}`);
  } finally {
    await client.end();
  }
}

async function createShadowDatabase(config) {
  const maintenance = new pg.Client({ connectionString: config.maintenanceUrl });
  await maintenance.connect();
  try {
    await maintenance.query(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(config.shadowDatabaseName)} WITH (FORCE)`
    );
    await maintenance.query(
      `CREATE DATABASE ${quoteIdentifier(config.shadowDatabaseName)}`
    );
  } finally {
    await maintenance.end();
  }

  const shadow = new pg.Client({ connectionString: config.shadowUrl });
  await shadow.connect();
  try {
    await shadow.query("CREATE SCHEMA IF NOT EXISTS extensions");
  } finally {
    await shadow.end();
  }
}

async function revokePublicDatabaseConnect(config) {
  const client = new pg.Client({ connectionString: config.databaseUrl });
  await client.connect();
  try {
    await client.query(
      `REVOKE CONNECT ON DATABASE ${quoteIdentifier(config.databaseName)} FROM PUBLIC`
    );
  } finally {
    await client.end();
  }
}

function prepareMigratedDatabase(config) {
  run(npmCommand(), ["run", "test:e2e:prepare"], {
    label: "Disposable database migration",
    env: { E2E_DATABASE_URL: config.databaseUrl },
  });
}

function provisionRuntimeRole(config) {
  run(
    psqlCommand(),
    [
      config.databaseUrl,
      "--set",
      "ON_ERROR_STOP=1",
      "--set",
      `runtime_password=${RUNTIME_PASSWORD}`,
      "--file",
      "scripts/provision-runtime-role.sql",
    ],
    { label: "Runtime-role provisioning" }
  );
}

function runIdempotentMigrationDeploy(config) {
  run(npxCommand(), ["--no-install", "prisma", "migrate", "deploy"], {
    label: "Idempotent migration deploy",
    env: {
      DATABASE_URL: config.databaseUrl,
      DIRECT_URL: config.databaseUrl,
    },
  });
}

function runMigrationStatus(config) {
  run(
    npxCommand(),
    ["--no-install", "prisma", "migrate", "status", "--schema", "prisma/schema.prisma"],
    {
      label: "Migration status",
      env: {
        DATABASE_URL: config.databaseUrl,
        DIRECT_URL: config.databaseUrl,
      },
    }
  );
}

function runMigrationDriftCheck(config) {
  run(
    npxCommand(),
    [
      "--no-install",
      "prisma",
      "migrate",
      "diff",
      "--exit-code",
      "--from-migrations",
      "prisma/migrations",
      "--to-url",
      config.databaseUrl,
      "--shadow-database-url",
      config.shadowUrl,
    ],
    { label: "Migration-history drift check" }
  );
}

function runExistingSecurityVerifier(config) {
  run(npmCommand(), ["run", "security:verify-database"], {
    label: "Existing database-security verifier",
    env: {
      DATABASE_URL: config.runtimeUrl,
      DIRECT_URL: config.runtimeUrl,
    },
  });
}

async function expectedMigrationCount() {
  const entries = await readdir("prisma/migrations", { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).length;
}

async function expectDatabaseError(action, allowedCodes, description) {
  try {
    await action();
  } catch (error) {
    if (allowedCodes.includes(error?.code)) return error.code;
    throw error;
  }
  throw new Error(`${description} unexpectedly succeeded.`);
}

async function verifyBrowserRoleDenial(admin) {
  await admin.query("BEGIN");
  try {
    await admin.query("SET LOCAL ROLE authenticated");
    await expectDatabaseError(
      () => admin.query('SELECT count(*) FROM public."User"'),
      ["42501"],
      "Authenticated browser-role table read"
    );
  } finally {
    await admin.query("ROLLBACK");
  }

  await admin.query("BEGIN");
  try {
    await admin.query('GRANT SELECT ON TABLE public."User" TO authenticated');
    await admin.query("SET LOCAL ROLE authenticated");
    const result = await admin.query('SELECT count(*)::int AS count FROM public."User"');
    assert.equal(result.rows[0]?.count, 0, "RLS must deny rows after an accidental grant.");
  } finally {
    await admin.query("ROLLBACK");
  }
}

async function verifyRuntimeTransactions(runtime, runtimeUrl) {
  const rollbackUserId = "99999999-9999-4999-8999-999999999999";
  await runtime.query("BEGIN");
  try {
    await runtime.query('INSERT INTO public."User" ("id") VALUES ($1)', [rollbackUserId]);
  } finally {
    await runtime.query("ROLLBACK");
  }

  const rollbackResult = await runtime.query(
    'SELECT count(*)::int AS count FROM public."User" WHERE "id" = $1',
    [rollbackUserId]
  );
  assert.equal(rollbackResult.rows[0]?.count, 0, "Rolled-back data must not persist.");

  const usageDate = "2099-12-31";
  const pool = new pg.Pool({ connectionString: runtimeUrl, max: 8 });
  try {
    await Promise.all(
      Array.from({ length: 8 }, () =>
        pool.query(
          `INSERT INTO public."AiGlobalDailyUsage"
            ("usageDate", "reservedTokens", "consumedTokens", "requestCount", "createdAt", "updatedAt")
           VALUES ($1::date, 0, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT ("usageDate") DO UPDATE
           SET "requestCount" = public."AiGlobalDailyUsage"."requestCount" + 1,
               "updatedAt" = CURRENT_TIMESTAMP`,
          [usageDate]
        )
      )
    );
  } finally {
    await pool.end();
  }

  const concurrentResult = await runtime.query(
    'SELECT "requestCount" FROM public."AiGlobalDailyUsage" WHERE "usageDate" = $1::date',
    [usageDate]
  );
  assert.equal(
    concurrentResult.rows[0]?.requestCount,
    8,
    "Concurrent idempotent upserts must preserve every increment."
  );
  await runtime.query(
    'DELETE FROM public."AiGlobalDailyUsage" WHERE "usageDate" = $1::date',
    [usageDate]
  );
}

async function collectAndAssertDatabaseEvidence(config) {
  const admin = new pg.Client({ connectionString: config.databaseUrl });
  const runtime = new pg.Client({ connectionString: config.runtimeUrl });
  await admin.connect();
  await runtime.connect();

  try {
    const roleResult = await admin.query(
      `SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolinherit,
              rolbypassrls, rolconnlimit
       FROM pg_roles
       WHERE rolname = $1`,
      [RUNTIME_ROLE]
    );
    const role = roleResult.rows[0];
    assert.ok(role, "Runtime role must exist.");
    assert.deepEqual(role, {
      rolcanlogin: true,
      rolsuper: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolinherit: false,
      rolbypassrls: true,
      rolconnlimit: 20,
    });

    await admin.query("BEGIN");
    try {
      await admin.query("INSERT INTO auth.sessions (id, user_id) VALUES (gen_random_uuid(), $1::uuid)", [E2E_USER.id]);
      await admin.query("INSERT INTO auth.refresh_tokens (user_id) VALUES ($1)", [E2E_USER.id]);
      await admin.query(`SET LOCAL ROLE ${RUNTIME_ROLE}`);
      const { rows: [privileges] } = await admin.query(
        "SELECT has_schema_privilege(current_user, 'auth', 'USAGE') AS can_access_auth"
      );
      assert.equal(privileges.can_access_auth, false);
      await admin.query(
        'UPDATE public."User" SET "accountStatus" = \'GUARDIAN_AUTHORIZATION_WITHDRAWN\' WHERE id = $1',
        [E2E_USER.id]
      );
      await admin.query("RESET ROLE");
      const { rows: [remaining] } = await admin.query(
        `SELECT
          (SELECT count(*)::int FROM auth.sessions WHERE user_id = $1::uuid) AS sessions,
          (SELECT count(*)::int FROM auth.refresh_tokens WHERE user_id = $1::text) AS refresh_tokens`,
        [E2E_USER.id]
      );
      assert.deepEqual(remaining, { sessions: 0, refresh_tokens: 0 });
    } finally {
      await admin.query("ROLLBACK");
    }

    const [security] = (
      await admin.query(
        `SELECT
          (SELECT count(*)::int FROM pg_tables WHERE schemaname = 'public') AS "tableCount",
          (SELECT count(*)::int
             FROM pg_tables t
             JOIN pg_class c ON c.relname = t.tablename
             JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
            WHERE t.schemaname = 'public' AND c.relrowsecurity) AS "rlsTableCount",
          (SELECT count(*)::int
             FROM information_schema.role_table_grants
            WHERE table_schema = 'public'
              AND grantee IN ('anon', 'authenticated')
              AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'))
            AS "browserCrudGrantCount",
          (SELECT count(*)::int
             FROM pg_tables
            WHERE schemaname = 'public'
              AND NOT has_table_privilege($1, format('%I.%I', schemaname, tablename), 'SELECT,INSERT,UPDATE,DELETE'))
            AS "runtimeTableGrantGapCount",
          (SELECT count(*)::int
             FROM information_schema.sequences
            WHERE sequence_schema = 'public'
              AND NOT has_sequence_privilege($1, format('%I.%I', sequence_schema, sequence_name), 'USAGE,SELECT,UPDATE'))
            AS "runtimeSequenceGrantGapCount",
          (SELECT count(*)::int
             FROM pg_tables
            WHERE schemaname = 'public' AND tableowner = $1) AS "runtimeOwnedTableCount",
          (SELECT count(*)::int
             FROM pg_indexes
            WHERE schemaname = 'public' AND indexname = ANY($2::text[])) AS "representativeIndexCount",
          has_database_privilege($1, current_database(), 'CONNECT') AS "runtimeCanConnect",
          has_database_privilege($1, current_database(), 'CREATE') AS "runtimeCanCreateDatabaseObjects",
          pg_get_userbyid((SELECT datdba FROM pg_database WHERE datname = current_database())) AS "databaseOwner"`,
        [RUNTIME_ROLE, EXPECTED_INDEXES]
      )
    ).rows;

    assert.equal(security.tableCount, security.rlsTableCount, "Every public table must enable RLS.");
    assert.equal(security.browserCrudGrantCount, 0, "Browser roles must have no direct CRUD grants.");
    assert.equal(security.runtimeTableGrantGapCount, 0, "Runtime role is missing table CRUD grants.");
    assert.equal(security.runtimeSequenceGrantGapCount, 0, "Runtime role is missing sequence grants.");
    assert.equal(security.runtimeOwnedTableCount, 0, "Runtime role must not own tables.");
    assert.equal(security.representativeIndexCount, EXPECTED_INDEXES.length, "Required indexes are missing.");
    assert.equal(security.runtimeCanConnect, true, "Runtime role needs explicit database CONNECT.");
    assert.equal(security.runtimeCanCreateDatabaseObjects, false, "Runtime role must not have database CREATE.");
    assert.notEqual(security.databaseOwner, RUNTIME_ROLE, "Runtime role must not own the database.");

    const migrations = await admin.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS applied,
              count(*) FILTER (WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL)::int AS failed
         FROM public._prisma_migrations`
    );
    const migrationEvidence = migrations.rows[0];
    const expected = await expectedMigrationCount();
    assert.equal(migrationEvidence.total, expected, "Every migration directory must have one record.");
    assert.equal(migrationEvidence.applied, expected, "Every migration must finish successfully.");
    assert.equal(migrationEvidence.failed, 0, "No failed or rolled-back migration may remain.");

    const seed = await runtime.query(
      'SELECT count(*)::int AS count FROM public."User" WHERE "id" = $1',
      [E2E_USER.id]
    );
    assert.equal(seed.rows[0]?.count, 1, "Idempotent migration deploy must preserve existing data.");

    await expectDatabaseError(
      () => runtime.query('CREATE TABLE public."RuntimeMustNotCreate" ("id" integer)'),
      ["42501"],
      "Runtime table creation"
    );
    await expectDatabaseError(
      () => runtime.query('CREATE SCHEMA "RuntimeMustNotCreate"'),
      ["42501"],
      "Runtime schema creation"
    );
    await expectDatabaseError(
      () => runtime.query('CREATE ROLE "RuntimeMustNotCreate"'),
      ["42501"],
      "Runtime role creation"
    );

    await verifyBrowserRoleDenial(admin);
    await verifyRuntimeTransactions(runtime, config.runtimeUrl);

    return {
      ...security,
      appliedMigrationCount: migrationEvidence.applied,
      browserDirectReadDenied: true,
      browserRlsRowsVisibleAfterTemporaryGrant: 0,
      concurrentIdempotentWriteCount: 8,
      requiredIndexes: EXPECTED_INDEXES,
      rollbackPreserved: true,
      runtimeDdlDenied: true,
      withdrawnSessionsRevokedWithoutRuntimeAuthGrants: true,
    };
  } finally {
    await runtime.end();
    await admin.end();
  }
}

function safeFailureReason(error) {
  if (!(error instanceof Error)) return "UNKNOWN_FAILURE";
  return error.message
    .replaceAll(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database-url-redacted]")
    .slice(0, 500);
}

async function writeEvidence(evidence) {
  await mkdir("output/test-results", { recursive: true });
  await writeFile(
    "output/test-results/database-security.json",
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8"
  );
}

async function main() {
  const config = resolveDatabaseSecurityConfig(process.env.E2E_DATABASE_URL);
  const evidence = {
    generatedAt: new Date().toISOString(),
    status: "failed",
    target: "disposable-loopback-postgresql",
  };
  let failure;

  try {
    await resetDisposableState(config);
    prepareMigratedDatabase(config);
    await createShadowDatabase(config);
    await revokePublicDatabaseConnect(config);
    provisionRuntimeRole(config);
    runIdempotentMigrationDeploy(config);
    runMigrationStatus(config);
    runMigrationDriftCheck(config);
    runExistingSecurityVerifier(config);
    evidence.assertions = await collectAndAssertDatabaseEvidence(config);
    evidence.status = "passed";
  } catch (error) {
    failure = error;
    evidence.failureReason = safeFailureReason(error);
  } finally {
    try {
      await resetDisposableState(config);
      evidence.cleanup = "passed";
    } catch (cleanupError) {
      evidence.status = "failed";
      evidence.cleanup = "failed";
      evidence.cleanupFailureReason = safeFailureReason(cleanupError);
      failure ??= cleanupError;
    }
    await writeEvidence(evidence);
  }

  if (failure) throw failure;
  console.info(JSON.stringify(evidence));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(
      `Database migration/role/RLS gate failed: ${safeFailureReason(error)}`
    );
    process.exitCode = 1;
  });
}
