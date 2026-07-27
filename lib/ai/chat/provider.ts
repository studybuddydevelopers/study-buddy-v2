import { FakeChatModelProvider } from "./fake-provider";
import { OpenAIChatModelProvider } from "./openai-provider";
import type { ChatModelProvider } from "./types";

export function getChatModelProvider(): ChatModelProvider {
  const provider = process.env.AI_CHAT_PROVIDER ?? "openai";

  if (provider === "fake") {
    return new FakeChatModelProvider();
  }

  if (provider === "openai") {
    return new OpenAIChatModelProvider();
  }

  throw new Error(`Unsupported AI_CHAT_PROVIDER: ${provider}`);
}
