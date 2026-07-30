import type { EmbeddingFailureCode } from "./types";

export class EmbeddingProviderError extends Error {
  readonly failureCode: EmbeddingFailureCode;

  constructor(failureCode: EmbeddingFailureCode, message: string = failureCode) {
    super(message);
    this.name = "EmbeddingProviderError";
    this.failureCode = failureCode;
  }
}

export function toEmbeddingFailureCode(error: unknown): EmbeddingFailureCode {
  if (error instanceof EmbeddingProviderError) return error.failureCode;
  return "PROVIDER_ERROR";
}
