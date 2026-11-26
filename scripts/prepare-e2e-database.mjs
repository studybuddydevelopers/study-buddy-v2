import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import pg from "pg";
import fixtureUsers from "../tests/e2e/support/fixture-users.json" with { type: "json" };

export const E2E_USER = Object.freeze(fixtureUsers.learner);
const E2E_PEER = Object.freeze(fixtureUsers.peer);

const E2E_SUBJECT_ID = "22222222-2222-4222-8222-222222222222";
const E2E_TOPIC_ID = "33333333-3333-4333-8333-333333333333";
const E2E_QUESTION_ID = "44444444-4444-4444-8444-444444444444";

export function validateE2eDatabaseUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("E2E_DATABASE_URL is required.");
  }

  const url = new URL(value);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("E2E_DATABASE_URL must use PostgreSQL.");
  }
  if (!isLoopbackHostname(url.hostname)) {
    throw new Error("E2E_DATABASE_URL must use a loopback host.");
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!/^[a-z][a-z0-9_]*_e2e$/i.test(databaseName)) {
    throw new Error("The disposable database name must end in _e2e.");
  }

  return { url, databaseName };
}

async function recreateDatabase(connectionUrl, databaseName) {
  const maintenanceUrl = new URL(connectionUrl);
  maintenanceUrl.pathname = "/postgres";
  maintenanceUrl.searchParams.delete("schema");

  const client = new pg.Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
      END
      $$;
    `);
  } finally {
    await client.end();
  }

  const databaseClient = new pg.Client({ connectionString: connectionUrl.toString() });
  await databaseClient.connect();
  try {
    await databaseClient.query("CREATE SCHEMA IF NOT EXISTS extensions");
  } finally {
    await databaseClient.end();
  }
}

function applyMigrations(databaseUrl) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    command,
    ["--no-install", "prisma", "migrate", "deploy"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        DIRECT_URL: databaseUrl,
      },
      stdio: "inherit",
    }
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Prisma migrations failed with exit code ${result.status}.`);
  }
}

async function seedSyntheticJourney(databaseUrl) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  const now = new Date();

  try {
    await prisma.user.create({
      data: {
        id: E2E_USER.id,
        accountStatus: "ACTIVE",
        aiAccessAuthorized: true,
        termsAcceptedAt: now,
        termsVersion: "e2e-test",
        profile: {
          create: {
            firstName: E2E_USER.firstName,
            lastNames: "Student",
            phoneNumber: "00000000000",
            gradeLevel: "SS3",
            examYear: 2027,
            preferredSubjects: ["Mathematics"],
            dateOfBirth: new Date("2000-01-01T00:00:00.000Z"),
          },
        },
        settings: { create: {} },
        subscriptions: {
          create: { plan: "free", status: "active", startDate: now },
        },
      },
    });

    await prisma.user.create({
      data: {
        id: E2E_PEER.id,
        accountStatus: "ACTIVE",
        aiAccessAuthorized: true,
        profile: {
          create: {
            firstName: E2E_PEER.firstName,
            lastNames: "Student",
            phoneNumber: "00000000001",
            preferredSubjects: [],
            dateOfBirth: new Date("2000-01-01T00:00:00.000Z"),
          },
        },
      },
    });

    await prisma.subject.create({
      data: {
        id: E2E_SUBJECT_ID,
        name: "Mathematics",
        examCode: "WAEC-MATH",
        topics: {
          create: {
            id: E2E_TOPIC_ID,
            title: "Synthetic E2E Algebra",
            sortOrder: 1,
          },
        },
      },
    });

    await prisma.pastQuestion.create({
      data: {
        id: E2E_QUESTION_ID,
        subjectId: E2E_SUBJECT_ID,
        topicId: E2E_TOPIC_ID,
        questionText: "What is 1 + 1?",
        answerText: "2",
        explanationText: "One item plus one item makes two items.",
        year: 2027,
        questionNumber: "E2E-1",
        difficulty: 1,
        source: "synthetic-e2e",
      },
    });

    await prisma.pastQuestionAttempt.create({
      data: {
        userId: E2E_USER.id,
        questionId: E2E_QUESTION_ID,
        userAnswer: "2",
        isCorrect: true,
        score: 1,
        timeTakenSeconds: 5,
        attemptedAt: now,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function isLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "::1" ||
    normalized === "0.0.0.0" ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
}

async function main() {
  const configuredUrl = process.env.E2E_DATABASE_URL;
  const { url, databaseName } = validateE2eDatabaseUrl(configuredUrl);
  const databaseUrl = url.toString();

  console.log(`Recreating disposable database ${databaseName} on ${url.hostname}.`);
  await recreateDatabase(url, databaseName);
  applyMigrations(databaseUrl);
  await seedSyntheticJourney(databaseUrl);
  console.log("Disposable E2E database is migrated and seeded.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "E2E database setup failed.");
    process.exitCode = 1;
  });
}
