import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), budget: vi.fn() }));
vi.mock("openai", () => ({ default: class {
  chat = { completions: { create: mocks.create } };
} }));
vi.mock("@/lib/security/ai-budget", () => ({
  GlobalAiBudgetExceededError: class extends Error {},
  GlobalAiBudgetUnavailableError: class extends Error {},
  withGlobalAiTokenBudget: mocks.budget,
}));

import { OpenAIChatModelProvider } from "./openai-provider";
import { generateChatTitle } from "../chats/chat-title";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.create.mockResolvedValue({ choices: [{ message: { content: "Understanding set unions" }, finish_reason: "stop" }], usage: { total_tokens: 35 } });
  mocks.budget.mockImplementation(({ operation }) => operation());
});

describe("short auxiliary OpenAI requests", () => {
  it("enforces the title deadline with no automatic retry while retaining the token-budget guard", async () => {
    const provider = new OpenAIChatModelProvider({ apiKey: "synthetic-key", model: "test-model" });
    expect(await generateChatTitle(provider, ["What does a union of two sets mean?"])).toBe("Understanding set unions");
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ model: "test-model", max_tokens: 64 }), { timeout: 6000, maxRetries: 0 });
    expect(mocks.budget).toHaveBeenCalledTimes(1);
    expect(mocks.budget).toHaveBeenCalledWith(expect.objectContaining({ maxOutputTokens: 64, promptMaterial: expect.any(Array), readActualTokens: expect.any(Function) }));
    expect(mocks.budget.mock.calls[0][0].readActualTokens({ usage: { total_tokens: 35 } })).toBe(35);
  });

  it("leaves ordinary reply timeout/retry settings at their configured defaults", async () => {
    const provider = new OpenAIChatModelProvider({ apiKey: "synthetic-key" });
    await provider.generate({ messages: [{ role: "user", content: "Explain sets" }] });
    expect(mocks.create).toHaveBeenCalledWith(expect.any(Object), undefined);
  });
});
