import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  findAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminUser: { findUnique: dbMock.findAdmin },
  },
}));

import { hasAdminAccess } from "./auth";

describe("admin authorization", () => {
  beforeEach(() => dbMock.findAdmin.mockReset());

  it("rejects a user without a matching admin row", async () => {
    dbMock.findAdmin.mockResolvedValue(null);

    expect(await hasAdminAccess({ id: "user-1" })).toBe(false);
  });

  it("uses the AdminUser row as the single source of admin access", async () => {
    dbMock.findAdmin.mockResolvedValue({ id: "admin-1" });

    expect(await hasAdminAccess({ id: "user-1" })).toBe(true);
    expect(dbMock.findAdmin).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { id: true },
    });
  });
});
