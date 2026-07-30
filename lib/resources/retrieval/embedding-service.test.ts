import {
  ResourceChunkEmbeddingFailureCode,
  ResourceChunkEmbeddingStatus,
  ResourceEmbeddingConfigurationStatus,
  type ResourceChunkEmbedding,
  type ResourceEmbeddingConfiguration,
} from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FakeEmbeddingProvider } from "@/lib/ai/embeddings/fake-provider";
import {
  buildEmbeddingBatches,
  embedApprovedResourceChunks,
  validateProviderVectors,
} from "./embedding-service";
import type { EmbeddingLease } from "./resource-embedding-repository";

describe("embedding service", () => {
  it("builds token-aware batches", () => {
    const leases = [
      lease("embedding-1", "chunk-1", 20),
      lease("embedding-2", "chunk-2", 90),
      lease("embedding-3", "chunk-3", 10),
    ];

    const batches = buildEmbeddingBatches(leases, {
      batchSize: 3,
      maxBatchTokens: 100,
    });

    expect(batches.map((batch) => batch.map((item) => item.chunk.id))).toEqual([
      ["chunk-1"],
      ["chunk-2", "chunk-3"],
    ]);
  });

  it("rejects provider-result count mismatches", () => {
    expect(() => validateProviderVectors([[1, 2]], 2, 2)).toThrow(
      "INVALID_VECTOR_COUNT"
    );
  });

  it("rejects dimension mismatches", () => {
    expect(() => validateProviderVectors([[1, 2]], 1, 3)).toThrow(
      "DIMENSION_MISMATCH"
    );
  });

  it("rejects non-finite vector values", () => {
    expect(() => validateProviderVectors([[1, Number.NaN]], 1, 2)).toThrow(
      "INVALID_VECTOR_VALUE"
    );
  });

  it("marks malformed provider output as safe failures", async () => {
    const repository = new FakeEmbeddingRepository([
      lease("embedding-1", "chunk-1", 10),
      lease("embedding-2", "chunk-2", 10),
    ]);

    const report = await embedApprovedResourceChunks({
      provider: new FakeEmbeddingProvider({
        dimensions: 4,
        mode: "COUNT_MISMATCH",
      }),
      repository,
      batchSize: 2,
    });

    expect(report.completed).toBe(0);
    expect(report.failed).toBe(2);
    expect(repository.completedWrites).toHaveLength(0);
    expect(repository.failedWrites).toEqual([
      {
        embeddingId: "embedding-1",
        failureCode:
          ResourceChunkEmbeddingFailureCode.INVALID_PROVIDER_RESPONSE,
      },
      {
        embeddingId: "embedding-2",
        failureCode:
          ResourceChunkEmbeddingFailureCode.INVALID_PROVIDER_RESPONSE,
      },
    ]);
  });

  it("marks dimension mismatch failures without writing wrong vectors", async () => {
    const repository = new FakeEmbeddingRepository([
      lease("embedding-1", "chunk-1", 10),
    ]);

    const report = await embedApprovedResourceChunks({
      provider: new FakeEmbeddingProvider({
        dimensions: 4,
        mode: "DIMENSION_MISMATCH",
      }),
      repository,
    });

    expect(report.failed).toBe(1);
    expect(repository.completedWrites).toHaveLength(0);
    expect(repository.failedWrites[0]?.failureCode).toBe(
      ResourceChunkEmbeddingFailureCode.DIMENSION_MISMATCH
    );
  });

  it("writes completed embeddings after successful validation", async () => {
    const repository = new FakeEmbeddingRepository([
      lease("embedding-1", "chunk-1", 10),
    ]);

    const report = await embedApprovedResourceChunks({
      provider: new FakeEmbeddingProvider({ dimensions: 4 }),
      repository,
    });

    expect(report.completed).toBe(1);
    expect(report.failed).toBe(0);
    expect(repository.completedWrites).toHaveLength(1);
    expect(repository.completedWrites[0]?.vector).toHaveLength(4);
  });

  it("does not create an embedding configuration during dry-run", async () => {
    const repository = new FakeEmbeddingRepository([]);

    const report = await embedApprovedResourceChunks({
      provider: new FakeEmbeddingProvider({ dimensions: 4 }),
      repository,
      dryRun: true,
    });

    expect(report.configurationId).toBe("not-created-dry-run");
    expect(repository.findOrCreateCalls).toBe(0);
    expect(report.coverage.eligibleChunkCount).toBe(0);
  });

  it("does not return unsupported vector columns from raw lease acquisition", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "resource-embedding-repository.ts"),
      "utf8"
    );

    expect(source).not.toMatch(/RETURNING\s+\*/i);
    expect(source).toContain('"completedAt"');
  });
});

class FakeEmbeddingRepository {
  readonly completedWrites: Array<{ embeddingId: string; vector: number[] }> = [];
  readonly failedWrites: Array<{
    embeddingId: string;
    failureCode: ResourceChunkEmbeddingFailureCode;
  }> = [];
  findOrCreateCalls = 0;

  constructor(private readonly leases: EmbeddingLease[]) {}

  async findConfiguration() {
    return null;
  }

  async findOrCreateConfiguration() {
    this.findOrCreateCalls += 1;
    return configuration();
  }

  async acquireEmbeddingLeases() {
    return this.leases;
  }

  async writeCompletedEmbeddings(
    rows: Array<{ embeddingId: string; vector: number[] }>
  ) {
    this.completedWrites.push(...rows);
  }

  async writeFailedEmbeddings(
    rows: Array<{
      embeddingId: string;
      failureCode: ResourceChunkEmbeddingFailureCode;
    }>
  ) {
    this.failedWrites.push(...rows);
  }

  async recalculateCoverage() {
    return {
      ...configuration(),
      eligibleChunkCount: this.leases.length,
      completedChunkCount: this.completedWrites.length,
      failedChunkCount: this.failedWrites.length,
    };
  }

  async countEligibleChunks() {
    return this.leases.length;
  }
}

function configuration(): ResourceEmbeddingConfiguration {
  const now = new Date();
  return {
    id: "config-1",
    provider: "fake",
    model: "fake-embedding-model",
    dimensions: 4,
    embeddingVersion: 1,
    status: ResourceEmbeddingConfigurationStatus.BUILDING,
    eligibleChunkCount: 0,
    completedChunkCount: 0,
    failedChunkCount: 0,
    createdAt: now,
    updatedAt: now,
    activatedAt: null,
    retiredAt: null,
  };
}

function lease(
  embeddingId: string,
  chunkId: string,
  tokenEstimate: number
): EmbeddingLease {
  const now = new Date();
  return {
    embedding: {
      id: embeddingId,
      resourceChunkId: chunkId,
      configurationId: "config-1",
      contentHash: `${chunkId}-hash`,
      status: ResourceChunkEmbeddingStatus.PENDING,
      failureCode: null,
      attemptCount: 1,
      leasedUntil: now,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    } satisfies ResourceChunkEmbedding,
    chunk: {
      id: chunkId,
      resourceId: "resource-1",
      version: 1,
      chunkIndex: 0,
      content: `content ${chunkId}`,
      contentHash: `${chunkId}-hash`,
      tokenEstimate,
    },
  };
}
