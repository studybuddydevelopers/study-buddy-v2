import OpenAI from "openai";
import { openAiClientOptions } from "@/lib/security/timeouts";
import {
  GlobalAiBudgetExceededError,
  GlobalAiBudgetUnavailableError,
  withGlobalAiTokenBudget,
} from "@/lib/security/ai-budget";
import { EmbeddingProviderError } from "./errors";
import type { EmbeddingProvider } from "./types";

type OpenAIEmbeddingResponseItem = {
  embedding?: unknown;
  index?: unknown;
};

export interface OpenAIEmbeddingProviderOptions {
  apiKey?: string;
  model?: string;
  dimensions?: number;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly dimensions: number;

  constructor(options: OpenAIEmbeddingProviderOptions = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new EmbeddingProviderError(
        "PROVIDER_ERROR",
        "OpenAI API key is not configured."
      );
    }

    this.client = new OpenAI({ apiKey, ...openAiClientOptions() });
    this.model = options.model ?? process.env.AI_EMBEDDING_MODEL ?? "text-embedding-3-small";
    this.dimensions = options.dimensions ?? readPositiveInt(process.env.AI_EMBEDDING_DIMENSIONS, 1536);
  }

  async embedDocuments(texts: string[]) {
    try {
      const response = await withGlobalAiTokenBudget({
        promptMaterial: texts,
        maxOutputTokens: 0,
        operation: () => this.client.embeddings.create({
          model: this.model,
          input: texts,
          dimensions: this.dimensions,
        }),
        readActualTokens: (result) => result.usage?.total_tokens,
      });
      return orderedEmbeddingsFromResponse(
        response.data,
        texts.length,
        this.dimensions
      );
    } catch (error) {
      throw mapOpenAIEmbeddingError(error);
    }
  }

  async embedQuery(text: string) {
    const [embedding] = await this.embedDocuments([text]);
    return embedding ?? [];
  }

  getDimensions() {
    return this.dimensions;
  }

  getModelName() {
    return this.model;
  }

  getProviderName() {
    return "openai";
  }
}

function readPositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function orderedEmbeddingsFromResponse(
  data: OpenAIEmbeddingResponseItem[],
  expectedCount: number,
  expectedDimensions: number
) {
  if (data.length !== expectedCount) {
    throw new EmbeddingProviderError("PROVIDER_ERROR");
  }

  const ordered = new Array<number[]>(expectedCount);
  const seen = new Set<number>();

  for (const item of data) {
    const index = item.index;
    if (
      !Number.isInteger(index) ||
      typeof index !== "number" ||
      index < 0 ||
      index >= expectedCount ||
      seen.has(index)
    ) {
      throw new EmbeddingProviderError("PROVIDER_ERROR");
    }

    const embedding = item.embedding;
    if (
      !Array.isArray(embedding) ||
      embedding.length !== expectedDimensions ||
      !embedding.every((value) => typeof value === "number" && Number.isFinite(value))
    ) {
      throw new EmbeddingProviderError("PROVIDER_ERROR");
    }

    ordered[index] = embedding;
    seen.add(index);
  }

  if (ordered.some((embedding) => !embedding)) {
    throw new EmbeddingProviderError("PROVIDER_ERROR");
  }

  return ordered;
}

function mapOpenAIEmbeddingError(error: unknown) {
  if (error instanceof EmbeddingProviderError) return error;

  if (error instanceof GlobalAiBudgetExceededError) {
    return new EmbeddingProviderError("RATE_LIMITED");
  }
  if (error instanceof GlobalAiBudgetUnavailableError) {
    return new EmbeddingProviderError("PROVIDER_ERROR");
  }

  const status =
    typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status)
      : undefined;

  if (status === 429) {
    return new EmbeddingProviderError("RATE_LIMITED");
  }

  if (status === 408 || status === 504) {
    return new EmbeddingProviderError("PROVIDER_TIMEOUT");
  }

  return new EmbeddingProviderError("PROVIDER_ERROR");
}
