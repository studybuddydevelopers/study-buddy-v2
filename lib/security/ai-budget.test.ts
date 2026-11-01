import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: dbMock.queryRaw,
    $executeRaw: dbMock.executeRaw,
  },
}));

import {
  estimateAiTokenReservation,
  globalAiBudgetErrorResponse,
  GlobalAiBudgetExceededError,
  GlobalAiBudgetUnavailableError,
  withGlobalAiTokenBudget,
} from "./ai-budget";

describe("global AI token budget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_GLOBAL_BUDGET_ENABLED", "true");
    vi.stubEnv("AI_GLOBAL_DAILY_TOKEN_BUDGET", "10000");
    dbMock.executeRaw.mockResolvedValue(1);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("uses a conservative prompt and output reservation", () => {
    expect(estimateAiTokenReservation("abcd", 100)).toBe(616);
  });

  it("reserves before the call and settles provider-reported usage", async () => {
    dbMock.queryRaw.mockResolvedValue([{ reservedTokens: 700 }]);

    const result = await withGlobalAiTokenBudget({
      promptMaterial: "hello",
      maxOutputTokens: 100,
      operation: async () => ({ usage: { total: 42 } }),
      readActualTokens: (value) => value.usage.total,
    });

    expect(result.usage.total).toBe(42);
    expect(dbMock.queryRaw).toHaveBeenCalledTimes(1);
    expect(dbMock.executeRaw).toHaveBeenCalledTimes(1);
  });

  it("blocks before provider execution when the atomic reservation fails", async () => {
    dbMock.queryRaw.mockResolvedValue([]);
    const operation = vi.fn();

    await expect(
      withGlobalAiTokenBudget({
        promptMaterial: "hello",
        maxOutputTokens: 100,
        operation,
      })
    ).rejects.toBeInstanceOf(GlobalAiBudgetExceededError);
    expect(operation).not.toHaveBeenCalled();
  });

  it("releases the reservation when the provider call fails", async () => {
    dbMock.queryRaw.mockResolvedValue([{ reservedTokens: 700 }]);

    await expect(
      withGlobalAiTokenBudget({
        promptMaterial: "hello",
        maxOutputTokens: 100,
        operation: async () => {
          throw new Error("provider failed");
        },
      })
    ).rejects.toThrow("provider failed");
    expect(dbMock.executeRaw).toHaveBeenCalledTimes(1);
  });

  it("defaults to fail-closed in production when budget storage fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_GLOBAL_BUDGET_ENABLED", "");
    dbMock.queryRaw.mockRejectedValue(new Error("database unavailable"));
    const operation = vi.fn();

    await expect(
      withGlobalAiTokenBudget({
        promptMaterial: "hello",
        maxOutputTokens: 100,
        operation,
      })
    ).rejects.toBeInstanceOf(GlobalAiBudgetUnavailableError);
    expect(operation).not.toHaveBeenCalled();
  });

  it("permits an explicit non-production-style budget opt-out", async () => {
    vi.stubEnv("AI_GLOBAL_BUDGET_ENABLED", "false");
    const operation = vi.fn().mockResolvedValue("result");

    await expect(
      withGlobalAiTokenBudget({
        promptMaterial: "hello",
        maxOutputTokens: 100,
        operation,
      })
    ).resolves.toBe("result");
    expect(dbMock.queryRaw).not.toHaveBeenCalled();
  });

  it.each([
    [new GlobalAiBudgetExceededError(), 429, "AI_GLOBAL_DAILY_LIMIT"],
    [new GlobalAiBudgetUnavailableError(), 503, "AI_BUDGET_GUARD_UNAVAILABLE"],
  ])("returns a no-store response for budget guard errors", async (error, status, code) => {
    const response = globalAiBudgetErrorResponse(error);

    expect(response?.status).toBe(status);
    expect(response?.headers.get("Cache-Control")).toBe("no-store");
    await expect(response?.json()).resolves.toMatchObject({ error: code });
  });
});
