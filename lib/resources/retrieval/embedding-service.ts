import { ResourceChunkEmbeddingFailureCode } from "@prisma/client";
import { toEmbeddingFailureCode } from "@/lib/ai/embeddings/errors";
import {
  getConfiguredEmbeddingProvider,
  getConfiguredEmbeddingVersion,
} from "@/lib/ai/embeddings/provider";
import type { EmbeddingProvider } from "@/lib/ai/embeddings/types";
import {
  ResourceEmbeddingRepository,
  type EmbeddingLease,
} from "./resource-embedding-repository";

interface EmbeddingRepositoryPort {
  findConfiguration?(
    input: Parameters<ResourceEmbeddingRepository["findConfiguration"]>[0]
  ): ReturnType<ResourceEmbeddingRepository["findConfiguration"]>;
  findOrCreateConfiguration(
    input: Parameters<ResourceEmbeddingRepository["findOrCreateConfiguration"]>[0]
  ): ReturnType<ResourceEmbeddingRepository["findOrCreateConfiguration"]>;
  acquireEmbeddingLeases(
    input: Parameters<ResourceEmbeddingRepository["acquireEmbeddingLeases"]>[0]
  ): ReturnType<ResourceEmbeddingRepository["acquireEmbeddingLeases"]>;
  writeCompletedEmbeddings(
    rows: Parameters<ResourceEmbeddingRepository["writeCompletedEmbeddings"]>[0]
  ): ReturnType<ResourceEmbeddingRepository["writeCompletedEmbeddings"]>;
  writeFailedEmbeddings(
    rows: Parameters<ResourceEmbeddingRepository["writeFailedEmbeddings"]>[0]
  ): ReturnType<ResourceEmbeddingRepository["writeFailedEmbeddings"]>;
  recalculateCoverage(
    configurationId: string
  ): ReturnType<ResourceEmbeddingRepository["recalculateCoverage"]>;
  countEligibleChunks?(): ReturnType<ResourceEmbeddingRepository["countEligibleChunks"]>;
}

export interface EmbedApprovedChunksInput {
  provider?: EmbeddingProvider;
  repository?: EmbeddingRepositoryPort;
  dryRun?: boolean;
  limit?: number;
  batchSize?: number;
  maxBatchTokens?: number;
  leaseMs?: number;
  embeddingVersion?: number;
}

export interface EmbeddingRunReport {
  dryRun: boolean;
  configurationId: string;
  provider: string;
  model: string;
  dimensions: number;
  embeddingVersion: number;
  leased: number;
  completed: number;
  failed: number;
  batches: number;
  failures: Array<{
    embeddingId: string;
    chunkId: string;
    failureCode: ResourceChunkEmbeddingFailureCode;
  }>;
  coverage: {
    eligibleChunkCount: number;
    completedChunkCount: number;
    failedChunkCount: number;
  };
}

const DEFAULT_BATCH_SIZE = 32;
const DEFAULT_MAX_BATCH_TOKENS = 8_000;
const DEFAULT_LIMIT = 100;
const DEFAULT_LEASE_MS = 5 * 60 * 1_000;

export async function embedApprovedResourceChunks(
  input: EmbedApprovedChunksInput = {}
): Promise<EmbeddingRunReport> {
  const provider = input.provider ?? getConfiguredEmbeddingProvider();
  const repository = input.repository ?? new ResourceEmbeddingRepository();
  const embeddingVersion = input.embeddingVersion ?? getConfiguredEmbeddingVersion();
  const configInput = {
    provider: provider.getProviderName(),
    model: provider.getModelName(),
    dimensions: provider.getDimensions(),
    embeddingVersion,
  };

  if (input.dryRun) {
    const existing = repository.findConfiguration
      ? await repository.findConfiguration(configInput)
      : null;
    const eligibleChunkCount = repository.countEligibleChunks
      ? await repository.countEligibleChunks()
      : 0;
    const coverage = existing
      ? await repository.recalculateCoverage(existing.id)
      : {
          eligibleChunkCount,
          completedChunkCount: 0,
          failedChunkCount: 0,
        };
    return {
      dryRun: true,
      configurationId: existing?.id ?? "not-created-dry-run",
      provider: configInput.provider,
      model: configInput.model,
      dimensions: configInput.dimensions,
      embeddingVersion: configInput.embeddingVersion,
      leased: 0,
      completed: 0,
      failed: 0,
      batches: 0,
      failures: [],
      coverage: toCoverage(coverage),
    };
  }

  const config = await repository.findOrCreateConfiguration(configInput);

  const leases = await repository.acquireEmbeddingLeases({
    configurationId: config.id,
    limit: input.limit ?? DEFAULT_LIMIT,
    leaseMs: input.leaseMs ?? DEFAULT_LEASE_MS,
  });
  const batches = buildEmbeddingBatches(leases, {
    batchSize: input.batchSize ?? DEFAULT_BATCH_SIZE,
    maxBatchTokens: input.maxBatchTokens ?? DEFAULT_MAX_BATCH_TOKENS,
  });
  const failures: EmbeddingRunReport["failures"] = [];
  let completed = 0;
  let failed = 0;

  for (const batch of batches) {
    try {
      const vectors = await provider.embedDocuments(
        batch.map((lease) => lease.chunk.content)
      );
      validateProviderVectors(vectors, batch.length, provider.getDimensions());
      await repository.writeCompletedEmbeddings(
        batch.map((lease, index) => ({
          embeddingId: lease.embedding.id,
          vector: vectors[index],
        }))
      );
      completed += batch.length;
    } catch (error) {
      const failureCode = normalizeFailureCode(error);
      await repository.writeFailedEmbeddings(
        batch.map((lease) => ({
          embeddingId: lease.embedding.id,
          failureCode,
        }))
      );
      failed += batch.length;
      failures.push(
        ...batch.map((lease) => ({
          embeddingId: lease.embedding.id,
          chunkId: lease.chunk.id,
          failureCode,
        }))
      );
    }
  }

  const coverage = await repository.recalculateCoverage(config.id);
  return {
    dryRun: false,
    configurationId: config.id,
    provider: config.provider,
    model: config.model,
    dimensions: config.dimensions,
    embeddingVersion: config.embeddingVersion,
    leased: leases.length,
    completed,
    failed,
    batches: batches.length,
    failures,
    coverage: toCoverage(coverage),
  };
}

export function buildEmbeddingBatches(
  leases: EmbeddingLease[],
  options: { batchSize: number; maxBatchTokens: number }
) {
  const batches: EmbeddingLease[][] = [];
  let current: EmbeddingLease[] = [];
  let currentTokens = 0;

  for (const lease of leases) {
    const tokenEstimate = Math.max(1, lease.chunk.tokenEstimate);
    const wouldExceedSize = current.length >= options.batchSize;
    const wouldExceedTokens =
      current.length > 0 && currentTokens + tokenEstimate > options.maxBatchTokens;

    if (wouldExceedSize || wouldExceedTokens) {
      batches.push(current);
      current = [];
      currentTokens = 0;
    }

    current.push(lease);
    currentTokens += tokenEstimate;
  }

  if (current.length > 0) batches.push(current);
  return batches;
}

export function validateProviderVectors(
  vectors: number[][],
  expectedCount: number,
  expectedDimensions: number
) {
  if (vectors.length !== expectedCount) {
    throw new Error("INVALID_VECTOR_COUNT");
  }

  for (const vector of vectors) {
    if (vector.length !== expectedDimensions) {
      throw new Error("DIMENSION_MISMATCH");
    }
    if (!vector.every(Number.isFinite)) {
      throw new Error("INVALID_VECTOR_VALUE");
    }
  }
}

function normalizeFailureCode(error: unknown) {
  const providerCode = toEmbeddingFailureCode(error);
  if (providerCode !== "PROVIDER_ERROR") {
    return providerCode as ResourceChunkEmbeddingFailureCode;
  }

  if (error instanceof Error && error.message === "DIMENSION_MISMATCH") {
    return ResourceChunkEmbeddingFailureCode.DIMENSION_MISMATCH;
  }

  if (
    error instanceof Error &&
    (error.message === "INVALID_VECTOR_COUNT" ||
      error.message === "INVALID_VECTOR_VALUE")
  ) {
    return ResourceChunkEmbeddingFailureCode.INVALID_PROVIDER_RESPONSE;
  }

  return ResourceChunkEmbeddingFailureCode.PROVIDER_ERROR;
}

function toCoverage(input: {
  eligibleChunkCount: number;
  completedChunkCount: number;
  failedChunkCount: number;
}) {
  return {
    eligibleChunkCount: input.eligibleChunkCount,
    completedChunkCount: input.completedChunkCount,
    failedChunkCount: input.failedChunkCount,
  };
}
