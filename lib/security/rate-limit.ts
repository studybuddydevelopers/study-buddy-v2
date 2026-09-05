import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/security/audit-log";

const MINUTE_MS = 60_000;
const DEFAULT_AUTHENTICATED_ACCOUNT_LIMIT = 300;
const DEFAULT_AUTHENTICATED_IP_LIMIT = 600;
const DEFAULT_AUTHENTICATED_WINDOW_MS = 5 * MINUTE_MS;
const DEFAULT_AI_ACCOUNT_LIMIT = 15;
const DEFAULT_AI_IP_LIMIT = 30;
const DEFAULT_AI_DAILY_LIMIT = 50;

interface RateLimitRule {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  scope: string;
  firstRejection: boolean;
}

export function getClientIp(requestHeaders: Headers) {
  const provider = configuredProxyProvider();

  if (provider === "railway") {
    return firstHeaderIp(requestHeaders.get("x-forwarded-for")) || "unknown";
  }
  if (provider === "cloudflare") {
    return firstHeaderIp(requestHeaders.get("cf-connecting-ip")) || "unknown";
  }
  if (provider === "vercel") {
    return firstHeaderIp(requestHeaders.get("x-vercel-forwarded-for")) || "unknown";
  }
  if (provider === "direct") return "unknown";

  // Development/test fallback. Production should select a trusted provider so
  // arbitrary forwarding headers are never treated as authoritative.
  return (
    firstHeaderIp(requestHeaders.get("x-forwarded-for")) ||
    firstHeaderIp(requestHeaders.get("x-real-ip")) ||
    "unknown"
  );
}

function configuredProxyProvider() {
  const configured = process.env.TRUSTED_PROXY_PROVIDER?.trim().toLowerCase();
  if (
    configured === "railway" ||
    configured === "cloudflare" ||
    configured === "vercel" ||
    configured === "direct"
  ) {
    return configured;
  }

  if (process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_SERVICE_ID) {
    return "railway";
  }
  if (process.env.VERCEL) return "vercel";
  return process.env.NODE_ENV === "production" ? "direct" : "development";
}

export async function enforceRateLimitRules(rules: RateLimitRule[]) {
  for (const rule of rules) {
    const result = await consumeRateLimit(rule);
    if (!result.allowed) return rateLimitResponse(result);
  }

  return null;
}

export async function enforceRequestIpRateLimit(requestHeaders: Headers) {
  const windowMs = positiveIntegerFromEnv(
    "AUTH_RATE_LIMIT_WINDOW_MS",
    DEFAULT_AUTHENTICATED_WINDOW_MS
  );

  return enforceRateLimitRules([
    {
      scope: "request:ip",
      identifier: getClientIp(requestHeaders),
      limit: positiveIntegerFromEnv(
        "AUTH_RATE_LIMIT_IP_MAX",
        DEFAULT_AUTHENTICATED_IP_LIMIT
      ),
      windowMs,
    },
  ]);
}

export async function enforceAccountRateLimit(accountId: string) {
  const windowMs = positiveIntegerFromEnv(
    "AUTH_RATE_LIMIT_WINDOW_MS",
    DEFAULT_AUTHENTICATED_WINDOW_MS
  );

  return enforceRateLimitRules([
    {
      scope: "authenticated:account",
      identifier: accountId,
      limit: positiveIntegerFromEnv(
        "AUTH_RATE_LIMIT_ACCOUNT_MAX",
        DEFAULT_AUTHENTICATED_ACCOUNT_LIMIT
      ),
      windowMs,
    },
  ]);
}

export async function enforceAiRequestLimits(input: {
  accountId: string;
  requestHeaders: Headers;
  units?: number;
}) {
  const minuteGuard = await enforceRateLimitRules([
    {
      scope: "ai:account",
      identifier: input.accountId,
      limit: positiveIntegerFromEnv(
        "AI_RATE_LIMIT_ACCOUNT_PER_MINUTE",
        DEFAULT_AI_ACCOUNT_LIMIT
      ),
      windowMs: MINUTE_MS,
    },
    {
      scope: "ai:ip",
      identifier: getClientIp(input.requestHeaders),
      limit: positiveIntegerFromEnv(
        "AI_RATE_LIMIT_IP_PER_MINUTE",
        DEFAULT_AI_IP_LIMIT
      ),
      windowMs: MINUTE_MS,
    },
  ]);
  if (minuteGuard) return minuteGuard;

  return consumeDailyAiQuota(
    input.accountId,
    input.units ?? 1,
    positiveIntegerFromEnv("AI_DAILY_USER_QUOTA", DEFAULT_AI_DAILY_LIMIT)
  );
}

export async function enforceAiAccountLimits(
  accountId: string,
  units = 1
) {
  const minuteGuard = await enforceRateLimitRules([
    {
      scope: "ai:account",
      identifier: accountId,
      limit: positiveIntegerFromEnv(
        "AI_RATE_LIMIT_ACCOUNT_PER_MINUTE",
        DEFAULT_AI_ACCOUNT_LIMIT
      ),
      windowMs: MINUTE_MS,
    },
  ]);
  if (minuteGuard) return minuteGuard;

  return consumeDailyAiQuota(
    accountId,
    units,
    positiveIntegerFromEnv("AI_DAILY_USER_QUOTA", DEFAULT_AI_DAILY_LIMIT)
  );
}

async function consumeRateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStartMs = Math.floor(now / rule.windowMs) * rule.windowMs;
  const windowStart = new Date(windowStartMs);
  const resetAt = new Date(windowStartMs + rule.windowMs);
  const expiresAt = new Date(windowStartMs + rule.windowMs * 2);
  const id = bucketId(rule.scope, rule.identifier, windowStartMs);

  const rows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    INSERT INTO "RateLimitBucket"
      ("id", "scope", "count", "windowStart", "expiresAt", "createdAt", "updatedAt")
    VALUES
      (${id}, ${rule.scope}, 1, ${windowStart}, ${expiresAt}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("id") DO UPDATE SET
      "count" = "RateLimitBucket"."count" + 1,
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "count"
  `);

  const count = rows[0]?.count ?? rule.limit + 1;
  if (id.endsWith("00")) {
    await prisma.rateLimitBucket.deleteMany({
      where: { expiresAt: { lt: new Date(now) } },
    });
  }

  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetAt,
    scope: rule.scope,
    firstRejection: count === rule.limit + 1,
  };
}

async function consumeDailyAiQuota(
  userId: string,
  units: number,
  limit: number
) {
  const safeUnits = Math.max(1, Math.floor(units));
  const now = new Date();
  const usageDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const resetAt = new Date(usageDate.getTime() + 24 * 60 * MINUTE_MS);

  if (safeUnits > limit) {
    return rateLimitResponse(
      {
        allowed: false,
        limit,
        remaining: 0,
        resetAt,
        scope: "ai:daily",
        firstRejection: true,
      },
      "Daily AI quota reached. Try again tomorrow."
    );
  }

  const rows = await prisma.$queryRaw<Array<{ requestCount: number }>>(Prisma.sql`
    INSERT INTO "AiDailyUsage"
      ("userId", "usageDate", "requestCount", "createdAt", "updatedAt")
    VALUES
      (${userId}, ${usageDate}, ${safeUnits}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("userId", "usageDate") DO UPDATE SET
      "requestCount" = "AiDailyUsage"."requestCount" + ${safeUnits},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "AiDailyUsage"."requestCount" + ${safeUnits} <= ${limit}
    RETURNING "requestCount"
  `);

  const count = rows[0]?.requestCount;
  if (count === undefined || count > limit) {
    return rateLimitResponse(
      {
        allowed: false,
        limit,
        remaining: 0,
        resetAt,
        scope: "ai:daily",
        firstRejection: true,
      },
      "Daily AI quota reached. Try again tomorrow."
    );
  }

  return null;
}

function rateLimitResponse(
  result: RateLimitResult,
  message = "Too many requests. Please try again later."
) {
  const retryAfter = Math.max(
    1,
    Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
  );

  if (result.firstRejection) {
    logSecurityEvent("rate_limit_exceeded", "warn", {
      scope: result.scope,
      limit: result.limit,
      retryAfterSeconds: retryAfter,
    });
  }

  return NextResponse.json(
    { error: "RATE_LIMITED", message },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt.getTime() / 1000)),
      },
    }
  );
}

function bucketId(scope: string, identifier: string, windowStartMs: number) {
  const secret = process.env.RATE_LIMIT_HASH_SECRET;
  const value = `${scope}\0${identifier}\0${windowStartMs}`;

  return secret
    ? createHmac("sha256", secret).update(value).digest("hex")
    : createHash("sha256").update(value).digest("hex");
}

function firstHeaderIp(value: string | null) {
  const first = value?.split(",")[0]?.trim();
  if (!first || first.length > 64) return null;

  // X-Forwarded-For normally contains a bare address, but tolerate the common
  // bracketed IPv6 and IPv4-with-port representations without accepting an
  // arbitrary attacker-controlled bucket identifier.
  const bracketedIpv6 = first.match(/^\[([^\]]+)\](?::\d{1,5})?$/)?.[1];
  const ipv4WithPort = first.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d{1,5}$/)?.[1];
  const candidate = bracketedIpv6 ?? ipv4WithPort ?? first;

  return isIP(candidate) ? candidate.toLowerCase() : null;
}

function positiveIntegerFromEnv(name: string, fallback: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
