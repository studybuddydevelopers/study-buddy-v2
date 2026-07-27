import { AiGenerationFailureCode } from "@prisma/client";
import { ChatProviderError } from "./errors";
import type { ChatModelProvider, GenerateInput, GenerateResult } from "./types";

interface FakeChatModelProviderOptions {
  text?: string;
  provider?: string;
  model?: string;
  delayMs?: number;
  failWith?: AiGenerationFailureCode;
  usage?: GenerateResult["usage"];
}

export class FakeChatModelProvider implements ChatModelProvider {
  private readonly options: FakeChatModelProviderOptions;
  invocationCount = 0;

  constructor(options: FakeChatModelProviderOptions = {}) {
    this.options = options;
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    void input;
    this.invocationCount += 1;

    if (this.options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.options.delayMs));
    }

    if (this.options.failWith) {
      throw new ChatProviderError(this.options.failWith);
    }

    return {
      text: this.options.text ?? "Fake tutor response.",
      provider: this.options.provider ?? "fake",
      model: this.options.model ?? "fake-chat-model",
      usage: this.options.usage,
    };
  }
}
