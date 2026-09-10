import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  userUpdateMany: vi.fn(),
  requestFindUnique: vi.fn(),
  requestUpsert: vi.fn(),
  requestUpdateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const transactionClient = {
    user: {
      findUnique: db.userFindUnique,
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
  getSupabaseAdminClient: vi.fn(),
}));

import {
  AccountLifecycleConflictError,
  cancelPermanentDeletion,
  confirmPermanentDeletion,
  deactivateAccount,
  preparePermanentDeletionConfirmation,
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
      data: {
        accountStatus: "DELETION_PENDING",
        deactivatedAt: new Date("2026-09-10T12:00:00.000Z"),
      },
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
});
