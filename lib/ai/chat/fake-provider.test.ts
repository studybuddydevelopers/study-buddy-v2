import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiGenerationFailureCode } from "@prisma/client";
import { ChatProviderError } from "./errors";
import { FakeChatModelProvider } from "./fake-provider";
import { getChatModelProvider } from "./provider";

describe("FakeChatModelProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a deterministic fake response without paid provider calls", async () => {
    const provider = new FakeChatModelProvider({ text: "Stored reply" });

    const result = await provider.generate({
      messages: [{ role: "user", content: "Explain fractions" }],
    });

    expect(result).toMatchObject({
      text: "Stored reply",
      provider: "fake",
      model: "fake-chat-model",
    });
    expect(provider.invocationCount).toBe(1);
  });

  it("can simulate safe provider failure codes", async () => {
    const provider = new FakeChatModelProvider({
      failWith: AiGenerationFailureCode.RATE_LIMITED,
    });

    await expect(
      provider.generate({ messages: [{ role: "user", content: "Hi" }] })
    ).rejects.toMatchObject({
      failureCode: AiGenerationFailureCode.RATE_LIMITED,
    });
    await expect(
      provider.generate({ messages: [{ role: "user", content: "Hi" }] })
    ).rejects.toBeInstanceOf(ChatProviderError);
  });

  it("supports deterministic invalid output through fake runtime mode", async () => {
    vi.stubEnv("AI_CHAT_PROVIDER", "fake");
    vi.stubEnv("AI_FAKE_CHAT_MODE", "INVALID_RESPONSE");
    const provider = new FakeChatModelProvider();

    const result = await provider.generate({
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(result.text).toBe("");
    expect(provider.invocationCount).toBe(1);
  });

  it("supports deterministic structured output modes through fake runtime controls", async () => {
    vi.stubEnv("AI_CHAT_PROVIDER", "fake");
    vi.stubEnv("AI_FAKE_STRUCTURED_CHAT_MODE", "UNKNOWN_LABEL");
    const provider = new FakeChatModelProvider({ text: "Structured reply" });

    const result = await provider.generateStructured({
      messages: [{ role: "user", content: "Explain ratios" }],
      outputSchema: { name: "test", schema: {} },
    });

    expect(result.value).toMatchObject({
      answer: "Structured reply [SOURCE_9]",
      citations: [{ sourceLabel: "SOURCE_9" }],
      insufficientContext: false,
    });
  });

  it("reads strict fake provider controls from an OS temp file", async () => {
    const controlFile = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "studybuddy-fake-chat-")),
      "control.json"
    );
    fs.writeFileSync(
      controlFile,
      JSON.stringify({
        mode: "FAILURE",
        structuredMode: "VALID",
        delayMs: 0,
        failureCode: AiGenerationFailureCode.RATE_LIMITED,
      })
    );
    vi.stubEnv("AI_CHAT_PROVIDER", "fake");
    vi.stubEnv("AI_FAKE_CHAT_CONTROL_FILE", controlFile);
    const provider = new FakeChatModelProvider();

    await expect(
      provider.generate({ messages: [{ role: "user", content: "Hi" }] })
    ).rejects.toMatchObject({
      failureCode: AiGenerationFailureCode.RATE_LIMITED,
    });

    fs.rmSync(path.dirname(controlFile), { recursive: true, force: true });
  });

  it("rejects fake provider runtime controls in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_CHAT_PROVIDER", "fake");
    vi.stubEnv("AI_FAKE_CHAT_MODE", "SUCCESS");
    const provider = new FakeChatModelProvider();

    await expect(
      provider.generate({ messages: [{ role: "user", content: "Hi" }] })
    ).rejects.toMatchObject({
      failureCode: AiGenerationFailureCode.INTERNAL_ERROR,
    });
  });

  it("does not resolve the fake chat provider in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AI_CHAT_PROVIDER", "fake");

    expect(() => getChatModelProvider()).toThrow(
      "Fake chat provider is not available in production."
    );
  });
});
