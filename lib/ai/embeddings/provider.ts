import { FakeEmbeddingProvider } from "./fake-provider";
import { OpenAIEmbeddingProvider } from "./openai-provider";
import type { EmbeddingProvider } from "./types";

export function getConfiguredEmbeddingProvider(): EmbeddingProvider {
  const provider = (process.env.AI_EMBEDDING_PROVIDER ?? "openai").toLowerCase();

  if (provider === "openai") {
    return new OpenAIEmbeddingProvider();
  }

  if (provider === "fake") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Fake embedding provider is not available in production.");
    }
    return new FakeEmbeddingProvider({
      dimensions: readPositiveInt(process.env.AI_EMBEDDING_DIMENSIONS, 1536),
      model: process.env.AI_EMBEDDING_MODEL ?? "fake-embedding-model",
      mode: readFakeMode(process.env.AI_FAKE_EMBEDDING_MODE),
    });
  }

  throw new Error("Unsupported embedding provider.");
}

export function getConfiguredEmbeddingVersion() {
  return readPositiveInt(process.env.AI_EMBEDDING_VERSION, 1);
}

function readPositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readFakeMode(value: string | undefined) {
  if (
    value === "SUCCESS" ||
    value === "FAILURE" ||
    value === "COUNT_MISMATCH" ||
    value === "DIMENSION_MISMATCH" ||
    value === "NON_FINITE"
  ) {
    return value;
  }
  return "SUCCESS";
}
