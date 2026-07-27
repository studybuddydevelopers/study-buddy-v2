import { describe, expect, it } from "vitest";
import { AiGenerationFailureCode } from "@prisma/client";
import { ChatProviderError } from "./errors";
import { FakeChatModelProvider } from "./fake-provider";

describe("FakeChatModelProvider", () => {
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
});
