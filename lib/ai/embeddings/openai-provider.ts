import OpenAI from "openai";
import { EmbeddingProviderError } from "./errors";
import type { EmbeddingProvider } from "./types";

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

    this.client = new OpenAI({ apiKey });
    this.model = options.model ?? process.env.AI_EMBEDDING_MODEL ?? "text-embedding-3-small";
    this.dimensions = options.dimensions ?? readPositiveInt(process.env.AI_EMBEDDING_DIMENSIONS, 1536);
  }

  async embedDocuments(texts: string[]) {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
        dimensions: this.dimensions,
      });
      return response.data.map((item) => item.embedding);
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

function mapOpenAIEmbeddingError(error: unknown) {
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
