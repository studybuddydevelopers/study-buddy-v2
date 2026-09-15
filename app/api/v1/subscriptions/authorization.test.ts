import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  findUnique: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findMany: mocks.findMany,
      count: mocks.count,
      findUnique: mocks.findUnique,
    },
    $transaction: mocks.transaction,
  },
}));

import { GET as listSubscriptions } from "./list/route";
import { GET as getSubscriptionStatus } from "./[id]/status/route";

describe("subscription ownership authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      user: { id: "auth-user-1" },
      dbUser: { id: "user-1" },
    });
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    mocks.transaction.mockImplementation((operations: Promise<unknown>[]) =>
      Promise.all(operations)
    );
  });

  it("always scopes subscription lists to the signed-in user", async () => {
    const response = await listSubscriptions(
      new Request(
        "https://studybuddyng.com/api/v1/subscriptions/list?userId=user-2"
      )
    );
    if (!response) throw new Error("Expected a subscription-list response");

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    );
    expect(mocks.count).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });

  it("rejects access to another user's subscription", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "subscription-2",
      userId: "user-2",
    });

    const response = await getSubscriptionStatus(
      new Request(
        "https://studybuddyng.com/api/v1/subscriptions/subscription-2/status"
      ),
      { params: Promise.resolve({ id: "subscription-2" }) }
    );
    if (!response) throw new Error("Expected a subscription-status response");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden — not your subscription",
    });
  });
});
