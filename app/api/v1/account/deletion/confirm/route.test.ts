import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class LifecycleConflict extends Error {}
  return {
    LifecycleConflict,
    confirmPermanentDeletion: vi.fn(),
    sendAccountDeletionPendingEmail: vi.fn(),
    getUserById: vi.fn(),
    syncAuthAccountStatus: vi.fn(),
    signedOutJsonResponse: vi.fn(),
    enforceRateLimitRules: vi.fn(),
    getClientIp: vi.fn(),
    logSecurityEvent: vi.fn(),
  };
});

vi.mock("@/lib/account-lifecycle", () => ({
  AccountLifecycleConflictError: mocks.LifecycleConflict,
  confirmPermanentDeletion: mocks.confirmPermanentDeletion,
}));

vi.mock("@/lib/account-deletion-email", () => ({
  hashAccountDeletionConfirmationToken: (token: string) => `hash:${token}`,
  sendAccountDeletionPendingEmail: mocks.sendAccountDeletionPendingEmail,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({
    auth: { admin: { getUserById: mocks.getUserById } },
  }),
}));

vi.mock("@/lib/guardian-authorization", () => ({
  syncAuthAccountStatus: mocks.syncAuthAccountStatus,
}));

vi.mock("@/lib/supabase/sign-out-response", () => ({
  signedOutJsonResponse: mocks.signedOutJsonResponse,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimitRules: mocks.enforceRateLimitRules,
  getClientIp: mocks.getClientIp,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logSecurityEvent: mocks.logSecurityEvent,
  securityFingerprint: (value: string) => `fingerprint:${value}`,
}));

import { POST } from "./route";

describe("account deletion email confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimitRules.mockResolvedValue(null);
    mocks.getClientIp.mockReturnValue("203.0.113.10");
    mocks.confirmPermanentDeletion.mockResolvedValue({
      requestId: "request-1",
      userId: "user-1",
      authUserId: "auth-user-1",
      scheduledFor: new Date("2026-09-25T12:00:00.000Z"),
    });
    mocks.syncAuthAccountStatus.mockResolvedValue(undefined);
    mocks.getUserById.mockResolvedValue({
      data: { user: { email: "student@example.com" } },
      error: null,
    });
    mocks.sendAccountDeletionPendingEmail.mockResolvedValue(undefined);
    mocks.signedOutJsonResponse.mockImplementation(
      async (_request: Request, body: Record<string, unknown>) =>
        Response.json(body, { headers: { "Cache-Control": "no-store" } })
    );
  });

  it("rejects malformed tokens before touching account state", async () => {
    const response = await POST(makeRequest("short"));

    expect(response.status).toBe(400);
    expect(mocks.confirmPermanentDeletion).not.toHaveBeenCalled();
  });

  it("locks the account, sends the final email, and clears the session", async () => {
    const token = "a".repeat(43);
    const response = await POST(makeRequest(token));

    expect(response.status).toBe(200);
    expect(mocks.confirmPermanentDeletion).toHaveBeenCalledWith(`hash:${token}`);
    expect(mocks.syncAuthAccountStatus).toHaveBeenCalledWith(
      "user-1",
      "DELETION_PENDING"
    );
    expect(mocks.sendAccountDeletionPendingEmail).toHaveBeenCalledWith({
      email: "student@example.com",
      requestId: "request-1",
      scheduledFor: new Date("2026-09-25T12:00:00.000Z"),
    });
    expect(mocks.signedOutJsonResponse).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toMatchObject({
      accountStatus: "DELETION_PENDING",
      notificationEmailSent: true,
    });
  });

  it("does not undo confirmation when the final notification cannot be sent", async () => {
    mocks.sendAccountDeletionPendingEmail.mockRejectedValue(
      new Error("email unavailable")
    );

    const response = await POST(makeRequest("b".repeat(43)));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      accountStatus: "DELETION_PENDING",
      notificationEmailSent: false,
    });
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith(
      "account_deletion_pending_email_failed",
      "error",
      expect.any(Object)
    );
  });

  it("normalises expired, reused, and invalid confirmation links", async () => {
    mocks.confirmPermanentDeletion.mockRejectedValue(
      new mocks.LifecycleConflict("internal state detail")
    );

    const response = await POST(makeRequest("c".repeat(43)));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "INVALID_OR_EXPIRED_CONFIRMATION",
      message: "This confirmation link is invalid, expired, or already used.",
    });
  });
});

function makeRequest(token: string) {
  return new Request(
    "https://studybuddyng.com/api/v1/account/deletion/confirm",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }
  );
}
