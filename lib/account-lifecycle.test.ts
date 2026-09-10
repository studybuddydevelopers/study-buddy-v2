import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  userUpdate: vi.fn(),
  userUpdateMany: vi.fn(),
  requestFindUnique: vi.fn(),
  requestUpsert: vi.fn(),
  requestUpdateMany: vi.fn(),
  getUserById: vi.fn(),
  sendInactiveAccountExpiryWarningEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const transactionClient = {
    user: {
      findUnique: db.userFindUnique,
      findMany: db.userFindMany,
      update: db.userUpdate,
      updateMany: db.userUpdateMany,
    },
    accountDeletionRequest: {
      findUnique: db.requestFindUnique,
      upsert: db.requestUpsert,
      updateMany: db.requestUpdateMany,
    },
  };
  return {
    prisma: {
      ...transactionClient,
      $transaction: vi.fn(
        async (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient)
      ),
    },
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: () => ({
    auth: { admin: { getUserById: db.getUserById } },
  }),
}));

vi.mock("@/lib/account-deletion-email", () => ({
  sendInactiveAccountExpiryWarningEmail:
    db.sendInactiveAccountExpiryWarningEmail,
}));

import {
  AccountLifecycleConflictError,
  cancelPermanentDeletion,
  confirmPermanentDeletion,
  deactivateAccount,
  inactiveAccountDeletionDate,
  preparePermanentDeletionConfirmation,
  processInactiveAccountRetention,
} from "./account-lifecycle";

describe("account lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("deactivates only an active account", async () => {
    db.userUpdateMany.mockResolvedValue({ count: 1 });

    await deactivateAccount("user-1");

    expect(db.userUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1", accountStatus: "ACTIVE" },
        data: expect.objectContaining({ accountStatus: "DEACTIVATED" }),
      })
    );
  });

  it("rejects a deactivation when the state transition loses its race", async () => {
    db.userUpdateMany.mockResolvedValue({ count: 0 });

    await expect(deactivateAccount("user-1")).rejects.toBeInstanceOf(
      AccountLifecycleConflictError
    );
  });

  it("records an email confirmation request without locking the active account", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
    db.userFindUnique.mockResolvedValue({ accountStatus: "ACTIVE" });
    db.requestUpsert.mockResolvedValue({ id: "request-1" });

    const result = await preparePermanentDeletionConfirmation({
      userId: "user-1",
      tokenHash: "token-hash",
      tokenExpiresAt: new Date("2026-09-11T12:00:00.000Z"),
    });

    expect(result).toEqual({ id: "request-1" });
    expect(db.userUpdateMany).not.toHaveBeenCalled();
    expect(db.requestUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: "AWAITING_CONFIRMATION",
          confirmationTokenHash: "token-hash",
        }),
      })
    );
    expect(db.requestUpsert.mock.calls[0][0].create).not.toHaveProperty(
      "scheduledFor"
    );
  });

  it("locks the account and starts a full 15-day window after email confirmation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
    db.requestFindUnique.mockResolvedValue({
      id: "request-1",
      userId: "user-1",
      authUserId: "user-1",
      status: "AWAITING_CONFIRMATION",
      confirmationTokenExpiresAt: new Date("2026-09-11T12:00:00.000Z"),
    });
    db.userUpdateMany.mockResolvedValue({ count: 1 });
    db.requestUpdateMany.mockResolvedValue({ count: 1 });

    const result = await confirmPermanentDeletion("token-hash");

    expect(db.userUpdateMany).toHaveBeenCalledWith({
      where: { id: "user-1", accountStatus: "ACTIVE" },
      data: expect.objectContaining({
        accountStatus: "DELETION_PENDING",
        deactivatedAt: new Date("2026-09-10T12:00:00.000Z"),
      }),
    });
    expect(result.scheduledFor.toISOString()).toBe("2026-09-25T12:00:00.000Z");
  });

  it("rejects an expired email token without locking the account", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
    db.requestFindUnique.mockResolvedValue({
      id: "request-1",
      userId: "user-1",
      authUserId: "user-1",
      status: "AWAITING_CONFIRMATION",
      confirmationTokenExpiresAt: new Date("2026-09-10T11:59:59.000Z"),
    });

    await expect(confirmPermanentDeletion("expired-token-hash")).rejects.toBeInstanceOf(
      AccountLifecycleConflictError
    );
    expect(db.userUpdateMany).not.toHaveBeenCalled();
  });

  it("does not reactivate when a deletion request can no longer be cancelled", async () => {
    db.requestUpdateMany.mockResolvedValue({ count: 0 });

    await expect(cancelPermanentDeletion("user-1")).rejects.toBeInstanceOf(
      AccountLifecycleConflictError
    );
    expect(db.userUpdate).not.toHaveBeenCalled();
  });

  it("calculates 36 calendar months without overflowing month-end dates", () => {
    expect(
      inactiveAccountDeletionDate(
        new Date("2024-02-29T12:30:00.000Z")
      ).toISOString()
    ).toBe("2027-02-28T12:30:00.000Z");
  });

  it("sends and records only the closest due inactivity warning", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
    db.userFindMany.mockResolvedValue([
      {
        id: "user-1",
        deactivatedAt: new Date("2023-09-25T12:00:00.000Z"),
        inactiveDeletionAt: new Date("2026-09-25T12:00:00.000Z"),
        inactiveWarning90SentAt: null,
        inactiveWarning60SentAt: null,
        inactiveWarning15SentAt: null,
        inactiveWarning1SentAt: null,
      },
    ]);
    db.getUserById.mockResolvedValue({
      data: { user: { email: "student@example.com" } },
      error: null,
    });
    db.sendInactiveAccountExpiryWarningEmail.mockResolvedValue(undefined);
    db.userUpdateMany.mockResolvedValue({ count: 1 });

    const result = await processInactiveAccountRetention();

    expect(db.sendInactiveAccountExpiryWarningEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "student@example.com",
        daysRemaining: 15,
        deletionAt: new Date("2026-09-25T12:00:00.000Z"),
      })
    );
    expect(db.userUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          inactiveWarning15SentAt: new Date("2026-09-10T12:00:00.000Z"),
        },
      })
    );
    expect(result).toMatchObject({ warningsSent: 1, warningsFailed: 0 });
  });

  it("queues an expired inactive account for immediate retryable purge", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
    const inactiveDeletionAt = new Date("2026-09-10T11:00:00.000Z");
    db.userFindMany.mockResolvedValue([
      {
        id: "user-1",
        deactivatedAt: new Date("2023-09-10T11:00:00.000Z"),
        inactiveDeletionAt,
        inactiveWarning90SentAt: new Date(),
        inactiveWarning60SentAt: new Date(),
        inactiveWarning15SentAt: new Date(),
        inactiveWarning1SentAt: new Date(),
      },
    ]);
    db.userUpdateMany.mockResolvedValue({ count: 1 });
    db.requestUpsert.mockResolvedValue({ id: "request-1" });

    const result = await processInactiveAccountRetention();

    expect(db.requestUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: "PENDING",
          retentionTriggeredAt: new Date("2026-09-10T12:00:00.000Z"),
          scheduledFor: new Date("2026-09-10T12:00:00.000Z"),
        }),
      })
    );
    expect(result.expirationsScheduled).toBe(1);
  });
});
