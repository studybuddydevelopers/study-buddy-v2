import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class SecurityError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  }
  return {
    SecurityError,
    confirm: vi.fn(),
    enforceRateLimitRules: vi.fn(),
    getClientIp: vi.fn(),
  };
});

vi.mock("@/lib/password-reset-security", () => ({
  confirmPasswordResetSecurityLock: mocks.confirm,
  isPasswordResetSecurityToken: (value: unknown) =>
    typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value),
  PasswordResetSecurityError: mocks.SecurityError,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimitRules: mocks.enforceRateLimitRules,
  getClientIp: mocks.getClientIp,
}));

import { POST } from "./route";

describe("password-reset security lock route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimitRules.mockResolvedValue(null);
    mocks.getClientIp.mockReturnValue("203.0.113.9");
    mocks.confirm.mockResolvedValue({
      lockedUntil: new Date("2026-09-15T10:00:00.000Z"),
      recoveryEmailSent: true,
    });
  });

  it("requires an exact same-origin POST", async () => {
    const response = await POST(makeRequest("a".repeat(43), "https://attacker.example"));

    expect(response.status).toBe(403);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("applies the lock only after an explicit valid POST", async () => {
    const token = "a".repeat(43);
    const response = await POST(makeRequest(token));

    expect(response.status).toBe(200);
    expect(mocks.confirm).toHaveBeenCalledWith(token);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      recoveryEmailSent: true,
    });
  });

  it("normalizes expired and reused token failures", async () => {
    mocks.confirm.mockRejectedValue(
      new mocks.SecurityError("INVALID_OR_EXPIRED_TOKEN")
    );

    const response = await POST(makeRequest("b".repeat(43)));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "INVALID_OR_EXPIRED_TOKEN",
      message: "This security link is invalid, expired, or already used.",
    });
  });
});

function makeRequest(token: string, origin = "https://studybuddyng.com") {
  return new Request(
    "https://studybuddyng.com/api/v1/account/security/password-reset-lock",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", origin },
      body: JSON.stringify({ token }),
    }
  );
}
