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
  GlobalAiBudgetExceededError,
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
});
