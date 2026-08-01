import { FakeChatModelProvider } from "./fake-provider";
import { OpenAIChatModelProvider } from "./openai-provider";
import type { ChatModelProvider } from "./types";

export function getChatModelProvider(): ChatModelProvider {
  const provider = process.env.AI_CHAT_PROVIDER ?? "openai";

  if (provider === "fake") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Fake chat provider is not available in production.");
    }
    return new FakeChatModelProvider();
  }

  if (provider === "openai") {
    return new OpenAIChatModelProvider();
  }

  throw new Error(`Unsupported AI_CHAT_PROVIDER: ${provider}`);
}
