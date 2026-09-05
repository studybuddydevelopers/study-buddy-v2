import { Buffer } from "node:buffer";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "./audit-log";

const DEFAULT_GLOBAL_DAILY_TOKEN_BUDGET = 1_000_000;
const MAX_SINGLE_RESERVATION = 250_000;

interface AiTokenReservation {
  usageDate: Date;
  tokens: number;
}

export class GlobalAiBudgetExceededError extends Error {
  constructor() {
    super("The global daily AI token budget has been reached.");
    this.name = "GlobalAiBudgetExceededError";
  }
}

export class GlobalAiBudgetUnavailableError extends Error {
  constructor() {
    super("The global AI budget guard is unavailable.");
    this.name = "GlobalAiBudgetUnavailableError";
  }
}

/** Reserve a conservative token upper bound before contacting an AI provider. */
export function estimateAiTokenReservation(
  promptMaterial: unknown,
  maxOutputTokens: number
) {
  const serialized =
    typeof promptMaterial === "string"
      ? promptMaterial
      : JSON.stringify(promptMaterial ?? "");
  const inputUpperBound = Buffer.byteLength(serialized, "utf8");
  const outputUpperBound = Math.max(0, Math.floor(maxOutputTokens));
  return Math.min(
    MAX_SINGLE_RESERVATION,
    Math.max(1, inputUpperBound + outputUpperBound + 512)
  );
}

export async function withGlobalAiTokenBudget<T>(input: {
  promptMaterial: unknown;
  maxOutputTokens: number;
  operation: () => Promise<T>;
  readActualTokens?: (result: T) => number | null | undefined;
}) {
  if (!globalBudgetIsEnabled()) return input.operation();

  const reservedTokens = estimateAiTokenReservation(
    input.promptMaterial,
    input.maxOutputTokens
  );
  const reservation = await reserveTokens(reservedTokens);

  let result: T;
  try {
    result = await input.operation();
  } catch (error) {
    await releaseReservation(reservation);
    throw error;
  }

  const reportedTokens = input.readActualTokens?.(result);
  const actualTokens =
    typeof reportedTokens === "number" &&
    Number.isFinite(reportedTokens) &&
    reportedTokens >= 0
      ? Math.floor(reportedTokens)
      : reservation.tokens;

  await settleReservation(reservation, actualTokens);
  return result;
}

export function globalAiBudgetErrorResponse(error: unknown) {
  if (error instanceof GlobalAiBudgetExceededError) {
    return NextResponse.json(
      {
        error: "AI_GLOBAL_DAILY_LIMIT",
        message: "The AI service has reached its daily usage limit.",
      },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (error instanceof GlobalAiBudgetUnavailableError) {
    return NextResponse.json(
      {
        error: "AI_BUDGET_GUARD_UNAVAILABLE",
        message: "The AI service is temporarily unavailable.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  return null;
}

function globalBudgetIsEnabled() {
  const configured = process.env.AI_GLOBAL_BUDGET_ENABLED?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
}

async function reserveTokens(tokens: number): Promise<AiTokenReservation> {
  const now = new Date();
  const usageDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const limit = positiveIntegerFromEnv(
    "AI_GLOBAL_DAILY_TOKEN_BUDGET",
    DEFAULT_GLOBAL_DAILY_TOKEN_BUDGET
  );

  if (tokens > limit) {
    logBudgetExhausted(limit);
    throw new GlobalAiBudgetExceededError();
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ reservedTokens: number }>>(
      Prisma.sql`
        INSERT INTO "AiGlobalDailyUsage"
          ("usageDate", "reservedTokens", "consumedTokens", "requestCount", "createdAt", "updatedAt")
        VALUES
          (${usageDate}, ${tokens}, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("usageDate") DO UPDATE SET
          "reservedTokens" = "AiGlobalDailyUsage"."reservedTokens" + ${tokens},
          "requestCount" = "AiGlobalDailyUsage"."requestCount" + 1,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE
          "AiGlobalDailyUsage"."reservedTokens" +
          "AiGlobalDailyUsage"."consumedTokens" + ${tokens} <= ${limit}
        RETURNING "reservedTokens"
      `
    );

    if (!rows[0]) {
      logBudgetExhausted(limit);
      throw new GlobalAiBudgetExceededError();
    }
    return { usageDate, tokens };
  } catch (error) {
    if (error instanceof GlobalAiBudgetExceededError) throw error;
    logSecurityEvent("ai_global_budget_guard_failed", "error");
    throw new GlobalAiBudgetUnavailableError();
  }
}

async function settleReservation(
  reservation: AiTokenReservation,
  actualTokens: number
) {
  try {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AiGlobalDailyUsage"
      SET
        "reservedTokens" = GREATEST(0, "reservedTokens" - ${reservation.tokens}),
        "consumedTokens" = "consumedTokens" + ${actualTokens},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "usageDate" = ${reservation.usageDate}
    `);
  } catch {
    // Keeping the reservation on settlement failure fails closed for the day.
    logSecurityEvent("ai_global_budget_settlement_failed", "error");
  }
}

async function releaseReservation(reservation: AiTokenReservation) {
  try {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AiGlobalDailyUsage"
      SET
        "reservedTokens" = GREATEST(0, "reservedTokens" - ${reservation.tokens}),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "usageDate" = ${reservation.usageDate}
    `);
  } catch {
    logSecurityEvent("ai_global_budget_release_failed", "error");
  }
}

function logBudgetExhausted(limit: number) {
  logSecurityEvent("ai_global_daily_budget_exhausted", "error", {
    tokenBudget: limit,
  });
}

function positiveIntegerFromEnv(name: string, fallback: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
