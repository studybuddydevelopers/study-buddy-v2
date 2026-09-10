import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  processDueAccountDeletions: vi.fn(),
  processInactiveAccountRetention: vi.fn(),
}));

vi.mock("@/lib/account-lifecycle", () => ({
  processDueAccountDeletions: mocks.processDueAccountDeletions,
  processInactiveAccountRetention: mocks.processInactiveAccountRetention,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logSecurityEvent: vi.fn(),
}));

import { POST } from "./route";

describe("account deletion cron", () => {
  beforeEach(() => {
    vi.stubEnv("ACCOUNT_DELETION_CRON_SECRET", "a".repeat(32));
    mocks.processDueAccountDeletions.mockReset();
    mocks.processDueAccountDeletions.mockResolvedValue({
      examined: 1,
      completed: 1,
      failed: 0,
    });
    mocks.processInactiveAccountRetention.mockReset();
    mocks.processInactiveAccountRetention.mockResolvedValue({
      examined: 2,
      warningsSent: 1,
      warningsFailed: 0,
      expirationsScheduled: 1,
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects a missing or incorrect secret", async () => {
    const response = await POST(makeRequest("b".repeat(32)));

    expect(response.status).toBe(401);
    expect(mocks.processDueAccountDeletions).not.toHaveBeenCalled();
    expect(mocks.processInactiveAccountRetention).not.toHaveBeenCalled();
  });

  it("rejects weak server configuration", async () => {
    vi.stubEnv("ACCOUNT_DELETION_CRON_SECRET", "replace-me");

    const response = await POST(makeRequest("replace-me"));

    expect(response.status).toBe(401);
  });

  it("runs a bounded purge for an authenticated scheduler", async () => {
    const response = await POST(makeRequest("a".repeat(32)));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      inactiveAccounts: {
        examined: 2,
        warningsSent: 1,
        warningsFailed: 0,
        expirationsScheduled: 1,
      },
      deletions: {
        examined: 1,
        completed: 1,
        failed: 0,
      },
    });
    expect(mocks.processInactiveAccountRetention).toHaveBeenCalledOnce();
    expect(mocks.processDueAccountDeletions).toHaveBeenCalledOnce();
  });
});

function makeRequest(secret: string) {
  return new Request("https://studybuddyng.com/api/v1/account/deletion/cron", {
    method: "POST",
    headers: { "x-cron-secret": secret },
  });
}
