import { createHash } from "node:crypto";
import { EmbeddingProviderError } from "./errors";
import type { EmbeddingProvider, EmbeddingFailureCode } from "./types";

export type FakeEmbeddingMode =
  | "SUCCESS"
  | "FAILURE"
  | "COUNT_MISMATCH"
  | "DIMENSION_MISMATCH"
  | "NON_FINITE";

export interface FakeEmbeddingProviderOptions {
  dimensions?: number;
  model?: string;
  mode?: FakeEmbeddingMode;
  failureCode?: EmbeddingFailureCode;
}

export class FakeEmbeddingProvider implements EmbeddingProvider {
  private readonly dimensions: number;
  private readonly model: string;
  private readonly mode: FakeEmbeddingMode;
  private readonly failureCode: EmbeddingFailureCode;

  constructor(options: FakeEmbeddingProviderOptions = {}) {
    this.dimensions = options.dimensions ?? 1536;
    this.model = options.model ?? "fake-embedding-model";
    this.mode = options.mode ?? "SUCCESS";
    this.failureCode = options.failureCode ?? "PROVIDER_ERROR";
  }

  async embedDocuments(texts: string[]) {
    if (this.mode === "FAILURE") {
      throw new EmbeddingProviderError(this.failureCode);
    }

    const vectors = texts.map((text) =>
      deterministicVector(
        text,
        this.mode === "DIMENSION_MISMATCH"
          ? this.dimensions - 1
          : this.dimensions
      )
    );

    if (this.mode === "COUNT_MISMATCH") {
      return vectors.slice(0, Math.max(0, vectors.length - 1));
    }

    if (this.mode === "NON_FINITE" && vectors[0]) {
      vectors[0][0] = Number.NaN;
    }

    return vectors;
  }

  async embedQuery(text: string) {
    const [vector] = await this.embedDocuments([text]);
    return vector ?? [];
  }

  getDimensions() {
    return this.dimensions;
  }

  getModelName() {
    return this.model;
  }

  getProviderName() {
    return "fake";
  }
}

function deterministicVector(text: string, dimensions: number) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const features = lexicalFeatures(text);

  for (const feature of features) {
    const digest = createHash("sha256").update(feature).digest();
    const index = digest.readUInt32BE(0) % dimensions;
    const sign = digest[4] % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }

  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0)
  );
  if (magnitude === 0) {
    const digest = createHash("sha256").update(text || "empty").digest();
    vector[digest.readUInt32BE(0) % dimensions] = 1;
    return vector;
  }

  return vector.map((value) => value / magnitude);
}

function lexicalFeatures(text: string) {
  const normalized = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  const words = normalized.split(/\s+/).filter((word) => word.length >= 2);
  const features = [...words];

  for (const word of words) {
    if (word.length < 4) continue;
    const padded = ` ${word} `;
    for (let index = 0; index <= padded.length - 3; index += 1) {
      features.push(`tri:${padded.slice(index, index + 3)}`);
    }
  }

  return features;
}
