import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  getUser: vi.fn(),
  enforceRequestIpRateLimit: vi.fn(),
  enforceAccountRateLimit: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ getAll: () => [] }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mocks.getUser } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    adminUser: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRequestIpRateLimit: mocks.enforceRequestIpRateLimit,
  enforceAccountRateLimit: mocks.enforceAccountRateLimit,
}));

vi.mock("@/lib/supabase/config", () => ({
  getServerSupabaseConfig: () => ({
    url: "https://project.supabase.co",
    key: "publishable-key",
  }),
}));

vi.mock("@/lib/password-reset-security", () => ({
  passwordResetSecurityRestrictionIsActive: (state: { locked: boolean } | null) =>
    Boolean(state?.locked),
}));

import { requireAuthenticatedUser } from "./auth";

describe("authenticated password-reset security lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRequestIpRateLimit.mockResolvedValue(null);
    mocks.enforceAccountRateLimit.mockResolvedValue(null);
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      accountStatus: "ACTIVE",
      passwordResetSecurityState: { locked: true },
    });
  });

  it("blocks existing authenticated sessions while the lock is active", async () => {
    const result = await requireAuthenticatedUser();

    expect("errorResponse" in result).toBe(true);
    if (!("errorResponse" in result)) throw new Error("expected rejection");
    const response = result.errorResponse;
    if (!response) throw new Error("expected error response");
    expect(response.status).toBe(423);
    await expect(response.json()).resolves.toMatchObject({
      error: "ACCOUNT_SECURITY_LOCKED",
      nextPath: "/forgot-password",
    });
  });

  it("allows only the dedicated recovery completion path", async () => {
    const result = await requireAuthenticatedUser({
      allowPasswordResetSecurityRecovery: true,
    });

    expect("errorResponse" in result).toBe(false);
  });
});
