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
  deactivateAccount,
  requestPermanentDeletion,
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

  it("locks an active account and schedules deletion before the 30-day maximum", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
    db.userFindUnique.mockResolvedValue({ accountStatus: "ACTIVE" });
    db.userUpdateMany.mockResolvedValue({ count: 1 });
    db.requestUpsert.mockImplementation(async (args) => ({
      scheduledFor: args.create.scheduledFor,
    }));

    const result = await requestPermanentDeletion("user-1");

    expect(db.userUpdateMany).toHaveBeenCalledWith({
      where: { id: "user-1", accountStatus: "ACTIVE" },
      data: {
        accountStatus: "DELETION_PENDING",
        deactivatedAt: new Date("2026-09-10T12:00:00.000Z"),
      },
    });
    expect(result.scheduledFor.toISOString()).toBe("2026-10-10T10:00:00.000Z");
  });

  it("does not reactivate when a deletion request can no longer be cancelled", async () => {
    db.requestUpdateMany.mockResolvedValue({ count: 0 });

    await expect(cancelPermanentDeletion("user-1")).rejects.toBeInstanceOf(
      AccountLifecycleConflictError
    );
    expect(db.userUpdate).not.toHaveBeenCalled();
  });
});
