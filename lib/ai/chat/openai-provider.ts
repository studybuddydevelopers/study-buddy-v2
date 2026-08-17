import { AiGenerationFailureCode } from "@prisma/client";
import OpenAI from "openai";
import { ChatProviderError } from "./errors";
import type {
  ChatModelProvider,
  GenerateInput,
  GenerateResult,
  StructuredGenerateInput,
  StructuredGenerateResult,
} from "./types";

type OpenAIChatCompletionResponse = {
  id?: string;
  model?: string;
  choices?: Array<{ message?: { content?: string | null } | null }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mapOpenAIError(error: unknown) {
  if (isRecord(error)) {
    const status = error.status;
    if (status === 429) {
      return AiGenerationFailureCode.RATE_LIMITED;
    }

    const code = error.code;
    const name = error.name;
    if (
      code === "ETIMEDOUT" ||
      code === "ECONNRESET" ||
      code === "ABORT_ERR" ||
      name === "AbortError"
    ) {
      return AiGenerationFailureCode.PROVIDER_TIMEOUT;
    }
  }

  return AiGenerationFailureCode.PROVIDER_ERROR;
}

export class OpenAIChatModelProvider implements ChatModelProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: { apiKey?: string; model?: string } = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ChatProviderError(
        AiGenerationFailureCode.PROVIDER_ERROR,
        "OPENAI_API_KEY is not configured"
      );
    }

    this.client = new OpenAI({ apiKey });
    this.model = options.model ?? process.env.AI_CHAT_MODEL ?? "gpt-4o-mini";
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: input.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        temperature: input.temperature ?? 0.3,
        max_tokens: input.maxOutputTokens ?? 500,
      });

      return {
        text: completion.choices?.[0]?.message?.content ?? "",
        provider: "openai",
        model: this.model,
        usage: {
          inputTokens: completion.usage?.prompt_tokens,
          outputTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens,
        },
      };
    } catch (error) {
      throw new ChatProviderError(mapOpenAIError(error));
    }
  }

  async generateStructured(
    input: StructuredGenerateInput
  ): Promise<StructuredGenerateResult> {
    try {
      const completion = await this.client.chat.completions.create(
        buildOpenAIStructuredChatRequest(input, this.model)
      );

      return parseOpenAIStructuredChatCompletion(completion, this.model);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ChatProviderError(
          AiGenerationFailureCode.INVALID_PROVIDER_RESPONSE
        );
      }
      throw new ChatProviderError(mapOpenAIError(error));
    }
  }
}

export function buildOpenAIStructuredChatRequest(
  input: StructuredGenerateInput,
  model: string
) {
  return {
    model,
    messages: input.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    temperature: input.temperature ?? 0.2,
    max_tokens: input.maxOutputTokens ?? 700,
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: input.outputSchema.name,
        schema: input.outputSchema.schema,
        strict: input.outputSchema.strict ?? true,
      },
    },
  };
}

export function parseOpenAIStructuredChatCompletion(
  completion: OpenAIChatCompletionResponse,
  model: string
): StructuredGenerateResult {
  const rawText = completion.choices?.[0]?.message?.content ?? "";

  return {
    value: JSON.parse(rawText),
    rawText,
    provider: "openai",
    model,
    usage: {
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens,
    },
  };
}
