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

  it("rejects an admin row when the user flag is false", async () => {
    expect(await hasAdminAccess({ id: "user-1", isAdmin: false })).toBe(false);
    expect(dbMock.findAdmin).not.toHaveBeenCalled();
  });

  it("rejects an admin flag without a matching admin row", async () => {
    dbMock.findAdmin.mockResolvedValue(null);

    expect(await hasAdminAccess({ id: "user-1", isAdmin: true })).toBe(false);
  });

  it("requires both the user flag and the matching admin row", async () => {
    dbMock.findAdmin.mockResolvedValue({ id: "admin-1" });

    expect(await hasAdminAccess({ id: "user-1", isAdmin: true })).toBe(true);
    expect(dbMock.findAdmin).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { id: true },
    });
  });
});
