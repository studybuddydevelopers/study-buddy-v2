import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  enforceRateLimitRules: vi.fn(),
  getClientIp: vi.fn(),
  processPasswordResetLimitAlert: vi.fn(),
  logSecurityEvent: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: mocks.after };
});

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimitRules: mocks.enforceRateLimitRules,
  getClientIp: mocks.getClientIp,
}));

vi.mock("@/lib/password-reset-security", () => ({
  processPasswordResetLimitAlert: mocks.processPasswordResetLimitAlert,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logSecurityEvent: mocks.logSecurityEvent,
  securityFingerprint: (value: string) => `fingerprint:${value}`,
}));

import { POST } from "./route";

describe("password-reset request abuse alert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getClientIp.mockReturnValue("203.0.113.9");
    mocks.after.mockImplementation((callback: () => unknown) => callback());
    mocks.processPasswordResetLimitAlert.mockResolvedValue({ outcome: "sent" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses school-safe account, IP, and global reset limits by default", async () => {
    mocks.enforceRateLimitRules.mockResolvedValue(
      Response.json({ error: "RATE_LIMITED" }, { status: 429 })
    );

    await POST(makeRequest("student@example.com"));

    expect(mocks.enforceRateLimitRules).toHaveBeenCalledWith(
      [
        {
          scope: "auth:password-reset:account",
          identifier: "student@example.com",
          limit: 3,
          windowMs: 3_600_000,
        },
        {
          scope: "auth:password-reset:ip",
          identifier: "203.0.113.9",
          limit: 300,
          windowMs: 3_600_000,
        },
        {
          scope: "auth:password-reset:global",
          identifier: "all-password-reset-requests",
          limit: 1_000,
          windowMs: 3_600_000,
        },
      ],
      expect.any(Function)
    );
  });

  it("reads password-reset limits from the environment", async () => {
    vi.stubEnv("PASSWORD_RESET_RATE_LIMIT_ACCOUNT_MAX", "4");
    vi.stubEnv("PASSWORD_RESET_RATE_LIMIT_IP_MAX", "450");
    vi.stubEnv("PASSWORD_RESET_RATE_LIMIT_GLOBAL_MAX", "1500");
    vi.stubEnv("PASSWORD_RESET_RATE_LIMIT_WINDOW_MS", "7200000");
    mocks.enforceRateLimitRules.mockResolvedValue(
      Response.json({ error: "RATE_LIMITED" }, { status: 429 })
    );

    await POST(makeRequest("Student@Example.com"));

    expect(mocks.enforceRateLimitRules).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          scope: "auth:password-reset:account",
          identifier: "student@example.com",
          limit: 4,
          windowMs: 7_200_000,
        }),
        expect.objectContaining({
          scope: "auth:password-reset:ip",
          limit: 450,
          windowMs: 7_200_000,
        }),
        expect.objectContaining({
          scope: "auth:password-reset:global",
          limit: 1_500,
          windowMs: 7_200_000,
        }),
      ],
      expect.any(Function)
    );
  });

  it("schedules an alert after only the first account-scoped rejection", async () => {
    mocks.enforceRateLimitRules.mockImplementation(
      async (_rules: unknown, onRejected: (result: unknown) => void) => {
        onRejected({
          allowed: false,
          limit: 3,
          remaining: 0,
          resetAt: new Date("2026-09-14T11:00:00.000Z"),
          scope: "auth:password-reset:account",
          firstRejection: true,
        });
        return Response.json(
          { error: "RATE_LIMITED", message: "Too many requests." },
          { status: 429 }
        );
      }
    );

    const response = await POST(makeRequest("Student@Example.com"));

    expect(response.status).toBe(429);
    expect(mocks.after).toHaveBeenCalledOnce();
    expect(mocks.processPasswordResetLimitAlert).toHaveBeenCalledWith({
      email: "student@example.com",
    });
  });

  it("does not send account alerts for an IP-only rejection", async () => {
    mocks.enforceRateLimitRules.mockImplementation(
      async (_rules: unknown, onRejected: (result: unknown) => void) => {
        onRejected({
          allowed: false,
          limit: 5,
          remaining: 0,
          resetAt: new Date("2026-09-14T11:00:00.000Z"),
          scope: "auth:password-reset:ip",
          firstRejection: true,
        });
        return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
      }
    );

    const response = await POST(makeRequest("victim@example.com"));

    expect(response.status).toBe(429);
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.processPasswordResetLimitAlert).not.toHaveBeenCalled();
  });
});

function makeRequest(email: string) {
  return new Request("https://studybuddyng.com/api/v1/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}
