export type EmbeddingFailureCode =
  | "PROVIDER_TIMEOUT"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "INVALID_PROVIDER_RESPONSE"
  | "DIMENSION_MISMATCH"
  | "INTERNAL_ERROR";

export interface EmbeddingProvider {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
  getDimensions(): number;
  getModelName(): string;
  getProviderName(): string;
}

export interface EmbeddingProviderConfig {
  provider: string;
  model: string;
  dimensions: number;
  embeddingVersion: number;
}
