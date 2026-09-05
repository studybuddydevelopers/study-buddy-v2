import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: prismaMocks.queryRaw,
    rateLimitBucket: { deleteMany: prismaMocks.deleteMany },
  },
}));

import {
  enforceAiRequestLimits,
  enforceRateLimitRules,
  getClientIp,
} from "./rate-limit";

describe("rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.deleteMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("uses the first platform-forwarded client IP", () => {
    vi.stubEnv("TRUSTED_PROXY_PROVIDER", "railway");
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.8, 10.0.0.2",
    });

    expect(getClientIp(headers)).toBe("203.0.113.8");
  });

  it("ignores spoofable Cloudflare and X-Real-IP headers on Railway", () => {
    vi.stubEnv("TRUSTED_PROXY_PROVIDER", "railway");
    const headers = new Headers({
      "cf-connecting-ip": "198.51.100.9",
      "x-real-ip": "198.51.100.10",
      "x-forwarded-for": "203.0.113.8, 10.0.0.2",
    });

    expect(getClientIp(headers)).toBe("203.0.113.8");
  });

  it("rejects malformed forwarded identifiers and normalizes bracketed IPv6", () => {
    vi.stubEnv("TRUSTED_PROXY_PROVIDER", "railway");

    expect(
      getClientIp(new Headers({ "x-forwarded-for": "not-an-ip, 10.0.0.2" }))
    ).toBe("unknown");
    expect(
      getClientIp(new Headers({ "x-forwarded-for": "[2001:DB8::1]:443" }))
    ).toBe("2001:db8::1");
  });

  it("returns standard 429 metadata when a bucket is exhausted", async () => {
    prismaMocks.queryRaw.mockResolvedValue([{ count: 3 }]);

    const response = await enforceRateLimitRules([
      {
        scope: "test",
        identifier: "account-1",
        limit: 2,
        windowMs: 60_000,
      },
    ]);

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect(response?.headers.get("X-RateLimit-Limit")).toBe("2");
  });

  it("enforces account, IP, then daily AI quota", async () => {
    prismaMocks.queryRaw
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([]);

    const response = await enforceAiRequestLimits({
      accountId: "user-1",
      requestHeaders: new Headers({ "x-forwarded-for": "203.0.113.9" }),
    });

    expect(prismaMocks.queryRaw).toHaveBeenCalledTimes(3);
    expect(response?.status).toBe(429);
    await expect(response?.json()).resolves.toMatchObject({
      error: "RATE_LIMITED",
      message: "Daily AI quota reached. Try again tomorrow.",
    });
  });
});
