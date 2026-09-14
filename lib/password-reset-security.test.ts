import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PasswordResetSecurityState } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  stateFindUnique: vi.fn(),
  stateFindUniqueOrThrow: vi.fn(),
  stateFindMany: vi.fn(),
  stateUpsert: vi.fn(),
  stateUpdate: vi.fn(),
  stateUpdateMany: vi.fn(),
  eventCreate: vi.fn(),
  transaction: vi.fn(),
  getUserById: vi.fn(),
  updateUserById: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  fetchWithTimeout: vi.fn(),
  logSecurityEvent: vi.fn(),
}));

const transactionClient = {
  passwordResetSecurityState: {
    findUnique: mocks.stateFindUnique,
    upsert: mocks.stateUpsert,
    updateMany: mocks.stateUpdateMany,
  },
  passwordResetSecurityEvent: { create: mocks.eventCreate },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    passwordResetSecurityState: {
      findUnique: mocks.stateFindUnique,
      findUniqueOrThrow: mocks.stateFindUniqueOrThrow,
      findMany: mocks.stateFindMany,
      upsert: mocks.stateUpsert,
      update: mocks.stateUpdate,
      updateMany: mocks.stateUpdateMany,
    },
    passwordResetSecurityEvent: { create: mocks.eventCreate },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({
    auth: {
      admin: {
        getUserById: mocks.getUserById,
        updateUserById: mocks.updateUserById,
      },
    },
  }),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { resetPasswordForEmail: mocks.resetPasswordForEmail },
  }),
}));

vi.mock("@/lib/security/timeouts", () => ({
  fetchWithTimeout: mocks.fetchWithTimeout,
}));

vi.mock("@/lib/security/audit-log", () => ({
  securityIdentifierHash: (value: string) => `lookup:${value.toLowerCase()}`,
  securityFingerprint: (value: string) => `fingerprint:${value}`,
  logSecurityEvent: mocks.logSecurityEvent,
}));

vi.mock("@/lib/supabase/config", () => ({
  getServerSupabaseConfig: () => ({
    url: "https://project.supabase.co",
    key: "publishable-key",
  }),
}));

import {
  beginPasswordResetSecurityRecovery,
  completePasswordResetSecurityRecovery,
  confirmPasswordResetSecurityLock,
  createPasswordResetSecurityToken,
  hashPasswordResetSecurityToken,
  isPasswordResetSecurityToken,
  passwordResetSecurityRestrictionIsActive,
  processPasswordResetLimitAlert,
  recordExpiredPasswordResetSecurityLocks,
} from "./password-reset-security";

describe("password-reset abuse security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_ORIGIN", "https://studybuddyng.com");
    vi.stubEnv("RESEND_API_KEY", "resend-test-key");
    vi.stubEnv(
      "TRANSACTIONAL_EMAIL_FROM",
      "Study Buddy Security <no-reply@updates.studybuddyng.com>"
    );
    mocks.transaction.mockImplementation(
      async (
        operation:
          | Promise<unknown>[]
          | ((client: typeof transactionClient) => Promise<unknown>)
      ) =>
        Array.isArray(operation)
          ? Promise.all(operation)
          : operation(transactionClient)
    );
    mocks.stateUpsert.mockResolvedValue({});
    mocks.stateUpdate.mockResolvedValue({});
    mocks.stateUpdateMany.mockResolvedValue({ count: 1 });
    mocks.eventCreate.mockResolvedValue({});
    mocks.fetchWithTimeout.mockResolvedValue(
      new Response(null, { status: 200 })
    );
  });

  afterEach(() => vi.unstubAllEnvs());

  it("creates fixed-format tokens and persists only their hashes", () => {
    const value = createPasswordResetSecurityToken();

    expect(isPasswordResetSecurityToken(value.token)).toBe(true);
    expect(value.tokenHash).toHaveLength(64);
    expect(hashPasswordResetSecurityToken(value.token)).toBe(value.tokenHash);
    expect(value.tokenHash).not.toContain(value.token);
  });

  it("does nothing for an unknown email fingerprint", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    await expect(
      processPasswordResetLimitAlert({ email: "missing@example.com" })
    ).resolves.toEqual({ outcome: "not_applicable" });
    expect(mocks.getUserById).not.toHaveBeenCalled();
    expect(mocks.fetchWithTimeout).not.toHaveBeenCalled();
  });

  it("does not alert an unverified account", async () => {
    mocks.userFindUnique.mockResolvedValue({ id: "user-1" });
    mocks.getUserById.mockResolvedValue({
      data: { user: { email: "student@example.com", email_confirmed_at: null } },
      error: null,
    });

    await expect(
      processPasswordResetLimitAlert({ email: "student@example.com" })
    ).resolves.toEqual({ outcome: "not_applicable" });
    expect(mocks.fetchWithTimeout).not.toHaveBeenCalled();
  });

  it("sends one warning to an exact, verified account match", async () => {
    const requestedAt = new Date("2026-09-14T10:00:00.000Z");
    mocks.userFindUnique.mockResolvedValue({ id: "user-1" });
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          email: "student@example.com",
          email_confirmed_at: "2026-09-01T00:00:00.000Z",
        },
      },
      error: null,
    });
    mocks.stateFindUnique.mockResolvedValue(null);

    await expect(
      processPasswordResetLimitAlert({
        email: "Student@Example.com",
        requestedAt,
      })
    ).resolves.toEqual({ outcome: "sent" });

    const body = JSON.parse(
      String(mocks.fetchWithTimeout.mock.calls[0][1].body)
    );
    expect(body.to).toEqual(["student@example.com"]);
    expect(body.text).toContain("If this was you, no action is needed");
    expect(body.text).toContain("#token=");
    expect(mocks.stateUpsert).toHaveBeenCalledOnce();
  });

  it("suppresses another warning during the separate cooldown", async () => {
    const requestedAt = new Date("2026-09-14T10:00:00.000Z");
    mocks.userFindUnique.mockResolvedValue({ id: "user-1" });
    mocks.getUserById.mockResolvedValue({
      data: {
        user: {
          email: "student@example.com",
          email_confirmed_at: "2026-09-01T00:00:00.000Z",
        },
      },
      error: null,
    });
    mocks.stateFindUnique.mockResolvedValue(
      makeState({
        lastAlertAttemptAt: new Date("2026-09-14T09:00:00.000Z"),
        alertDay: new Date("2026-09-14T00:00:00.000Z"),
        alertCount: 1,
      })
    );

    await expect(
      processPasswordResetLimitAlert({
        email: "student@example.com",
        requestedAt,
      })
    ).resolves.toEqual({ outcome: "suppressed" });
    expect(mocks.fetchWithTimeout).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation before changing Supabase Auth", async () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const token = "a".repeat(43);
    const initial = makeState({
      lockTokenHash: hashPasswordResetSecurityToken(token),
      lockTokenExpiresAt: new Date("2026-09-14T10:30:00.000Z"),
    });
    const claimed = makeState({
      ...initial,
      lockTokenUsedAt: now,
      lockedAt: now,
      lockedUntil: new Date("2026-09-15T10:00:00.000Z"),
    });
    mocks.stateFindUnique.mockResolvedValue(initial);
    mocks.stateFindUniqueOrThrow.mockResolvedValue(claimed);
    mocks.updateUserById.mockResolvedValue({
      data: { user: { email: "student@example.com" } },
      error: null,
    });

    const result = await confirmPasswordResetSecurityLock(token, now);

    expect(result.lockedUntil).toEqual(claimed.lockedUntil);
    expect(mocks.updateUserById).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        password: expect.any(String),
        ban_duration: "86400s",
      })
    );
    expect(mocks.updateUserById.mock.calls[0][1].password).not.toBe(token);
  });

  it("starts early recovery only from a live, single-use recovery token", async () => {
    const now = new Date("2026-09-14T12:00:00.000Z");
    const token = "b".repeat(43);
    mocks.stateFindUnique.mockResolvedValue(
      makeState({
        lockedAt: new Date("2026-09-14T10:00:00.000Z"),
        lockedUntil: new Date("2026-09-15T10:00:00.000Z"),
        authLockAppliedAt: new Date("2026-09-14T10:00:01.000Z"),
        recoveryTokenHash: hashPasswordResetSecurityToken(token),
        recoveryTokenExpiresAt: new Date("2026-09-15T10:00:00.000Z"),
      })
    );
    mocks.getUserById.mockResolvedValue({
      data: { user: { email: "student@example.com" } },
      error: null,
    });
    mocks.updateUserById.mockResolvedValue({ data: { user: {} }, error: null });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });

    await expect(
      beginPasswordResetSecurityRecovery(token, now)
    ).resolves.toEqual({ ok: true });
    expect(mocks.updateUserById).toHaveBeenCalledWith("user-1", {
      ban_duration: "none",
    });
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "student@example.com",
      { redirectTo: "https://studybuddyng.com/auth/password-reset" }
    );
  });

  it("keeps the application restriction until recovery completes", () => {
    const lockedAt = new Date("2026-09-14T10:00:00.000Z");
    expect(
      passwordResetSecurityRestrictionIsActive(
        makeState({ lockedAt, recoveryCompletedAt: null })
      )
    ).toBe(true);
    expect(
      passwordResetSecurityRestrictionIsActive(
        makeState({
          lockedAt,
          recoveryCompletedAt: new Date("2026-09-14T11:00:00.000Z"),
        })
      )
    ).toBe(false);
  });

  it("clears the application restriction only after a post-lock sign-in", async () => {
    const now = new Date("2026-09-14T12:00:00.000Z");
    mocks.stateFindUnique.mockResolvedValue(
      makeState({
        lockedAt: new Date("2026-09-14T10:00:00.000Z"),
        lockedUntil: new Date("2026-09-15T10:00:00.000Z"),
        authLockAppliedAt: new Date("2026-09-14T10:00:01.000Z"),
      })
    );
    mocks.getUserById.mockResolvedValue({
      data: {
        user: { last_sign_in_at: "2026-09-14T11:59:00.000Z" },
      },
      error: null,
    });
    mocks.updateUserById.mockResolvedValue({ data: { user: {} }, error: null });

    await expect(
      completePasswordResetSecurityRecovery("user-1", now)
    ).resolves.toEqual({ completed: true });

    expect(mocks.stateUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ recoveryCompletedAt: now }),
      })
    );
  });

  it("records provider-lock expiry without treating it as password recovery", async () => {
    const now = new Date("2026-09-15T10:01:00.000Z");
    mocks.stateFindMany.mockResolvedValue([{ userId: "user-1" }]);

    await expect(
      recordExpiredPasswordResetSecurityLocks(50, now)
    ).resolves.toEqual({ examined: 1, recorded: 1 });

    expect(mocks.stateUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { lockExpiryRecordedAt: now } })
    );
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventType: "LOCK_EXPIRED" }),
    });
  });
});

function makeState(
  overrides: Partial<PasswordResetSecurityState> = {}
): PasswordResetSecurityState {
  return {
    userId: "user-1",
    lastAlertAttemptAt: null,
    lastAlertSentAt: null,
    alertDay: null,
    alertCount: 0,
    lockTokenHash: null,
    lockTokenExpiresAt: null,
    lockTokenUsedAt: null,
    lockedAt: null,
    lockedUntil: null,
    lockExpiryRecordedAt: null,
    authLockAppliedAt: null,
    recoveryTokenHash: null,
    recoveryTokenExpiresAt: null,
    recoveryTokenUsedAt: null,
    recoveryStartedAt: null,
    recoveryCompletedAt: null,
    createdAt: new Date("2026-09-14T00:00:00.000Z"),
    updatedAt: new Date("2026-09-14T00:00:00.000Z"),
    ...overrides,
  };
}
