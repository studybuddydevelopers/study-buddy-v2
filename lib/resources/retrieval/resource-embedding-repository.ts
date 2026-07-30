import { randomUUID } from "node:crypto";
import {
  ResourceApprovalStatus,
  ResourceChunkEmbeddingFailureCode,
  ResourceChunkEmbeddingStatus,
  ResourceEmbeddingConfigurationStatus,
  ResourceProcessingStatus,
  type PrismaClient,
  type ResourceChunk,
  type ResourceChunkEmbedding,
} from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import type { EmbeddingProviderConfig } from "@/lib/ai/embeddings/types";

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

type EmbeddingPrisma = Pick<
  PrismaClient,
  | "$queryRaw"
  | "$executeRaw"
  | "$transaction"
  | "resourceEmbeddingConfiguration"
  | "resourceChunkEmbedding"
>;

export interface EmbeddingLease {
  embedding: ResourceChunkEmbedding;
  chunk: Pick<
    ResourceChunk,
    | "id"
    | "resourceId"
    | "version"
    | "chunkIndex"
    | "content"
    | "contentHash"
    | "tokenEstimate"
  >;
}

export interface AcquireEmbeddingLeasesInput {
  configurationId: string;
  limit: number;
  leaseMs: number;
}

export interface WriteEmbeddingFailureInput {
  embeddingId: string;
  failureCode: ResourceChunkEmbeddingFailureCode;
}

export class ResourceEmbeddingRepository {
  constructor(private readonly prisma: EmbeddingPrisma = defaultPrisma) {}

  async findConfiguration(input: EmbeddingProviderConfig) {
    return this.prisma.resourceEmbeddingConfiguration.findUnique({
      where: {
        provider_model_dimensions_embeddingVersion: {
          provider: input.provider,
          model: input.model,
          dimensions: input.dimensions,
          embeddingVersion: input.embeddingVersion,
        },
      },
    });
  }

  async findOrCreateConfiguration(input: EmbeddingProviderConfig) {
    return this.prisma.resourceEmbeddingConfiguration.upsert({
      where: {
        provider_model_dimensions_embeddingVersion: {
          provider: input.provider,
          model: input.model,
          dimensions: input.dimensions,
          embeddingVersion: input.embeddingVersion,
        },
      },
      create: {
        provider: input.provider,
        model: input.model,
        dimensions: input.dimensions,
        embeddingVersion: input.embeddingVersion,
        status: ResourceEmbeddingConfigurationStatus.BUILDING,
      },
      update: {},
    });
  }

  async acquireEmbeddingLeases(input: AcquireEmbeddingLeasesInput) {
    const limit = Math.max(1, Math.min(input.limit, 500));
    const leasedUntil = new Date(Date.now() + input.leaseMs);
    const candidates = await this.prisma.$queryRaw<
      Array<{
        id: string;
        resourceId: string;
        version: number;
        chunkIndex: number;
        content: string;
        contentHash: string;
        tokenEstimate: number;
      }>
    >`
      SELECT
        c."id",
        c."resourceId",
        c."version",
        c."chunkIndex",
        c."content",
        c."contentHash",
        c."tokenEstimate"
      FROM "ResourceChunk" c
      JOIN "Resource" r ON r."id" = c."resourceId"
      WHERE r."processingStatus" = ${ResourceProcessingStatus.PROCESSED}::"ResourceProcessingStatus"
        AND r."approvalStatus" = ${ResourceApprovalStatus.APPROVED}::"ResourceApprovalStatus"
        AND r."activeChunkVersion" IS NOT NULL
        AND c."version" = r."activeChunkVersion"
        AND NOT EXISTS (
          SELECT 1
          FROM "ResourceChunkEmbedding" completed
          WHERE completed."resourceChunkId" = c."id"
            AND completed."configurationId" = ${input.configurationId}
            AND completed."contentHash" = c."contentHash"
            AND completed."status" = ${ResourceChunkEmbeddingStatus.COMPLETED}::"ResourceChunkEmbeddingStatus"
        )
      ORDER BY r."updatedAt" DESC, r."id" ASC, c."chunkIndex" ASC, c."id" ASC
      LIMIT ${limit}
    `;

    const leases: EmbeddingLease[] = [];
    await this.prisma.$transaction(async (tx) => {
      for (const candidate of candidates) {
        const acquired = await acquireOneLease(tx, {
          configurationId: input.configurationId,
          chunkId: candidate.id,
          contentHash: candidate.contentHash,
          leasedUntil,
        });
        if (acquired) {
          leases.push({
            embedding: acquired,
            chunk: candidate,
          });
        }
      }
    });

    return leases;
  }

  async countEligibleChunks() {
    const [row] = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "ResourceChunk" c
      JOIN "Resource" r ON r."id" = c."resourceId"
      WHERE r."processingStatus" = ${ResourceProcessingStatus.PROCESSED}::"ResourceProcessingStatus"
        AND r."approvalStatus" = ${ResourceApprovalStatus.APPROVED}::"ResourceApprovalStatus"
        AND r."activeChunkVersion" IS NOT NULL
        AND c."version" = r."activeChunkVersion"
    `;

    return Number(row?.count ?? 0);
  }

  async writeCompletedEmbeddings(
    rows: Array<{ embeddingId: string; vector: number[] }>
  ) {
    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        await tx.$executeRaw`
          UPDATE "ResourceChunkEmbedding"
          SET
            "status" = ${ResourceChunkEmbeddingStatus.COMPLETED}::"ResourceChunkEmbeddingStatus",
            "failureCode" = NULL,
            "leasedUntil" = NULL,
            "embedding" = ${toVectorLiteral(row.vector)}::extensions.vector,
            "completedAt" = CURRENT_TIMESTAMP,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${row.embeddingId}
        `;
      }
    });
  }

  async writeFailedEmbeddings(rows: WriteEmbeddingFailureInput[]) {
    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        await tx.resourceChunkEmbedding.update({
          where: { id: row.embeddingId },
          data: {
            status: ResourceChunkEmbeddingStatus.FAILED,
            failureCode: row.failureCode,
            leasedUntil: null,
            completedAt: null,
          },
        });
      }
    });
  }

  async recalculateCoverage(configurationId: string) {
    const [counts] = await this.prisma.$queryRaw<
      Array<{
        eligibleChunkCount: bigint;
        completedChunkCount: bigint;
        failedChunkCount: bigint;
      }>
    >`
      WITH eligible AS (
        SELECT c."id", c."contentHash"
        FROM "ResourceChunk" c
        JOIN "Resource" r ON r."id" = c."resourceId"
        WHERE r."processingStatus" = ${ResourceProcessingStatus.PROCESSED}::"ResourceProcessingStatus"
          AND r."approvalStatus" = ${ResourceApprovalStatus.APPROVED}::"ResourceApprovalStatus"
          AND r."activeChunkVersion" IS NOT NULL
          AND c."version" = r."activeChunkVersion"
      )
      SELECT
        COUNT(*)::bigint AS "eligibleChunkCount",
        COUNT(e.*) FILTER (
          WHERE e."status" = ${ResourceChunkEmbeddingStatus.COMPLETED}::"ResourceChunkEmbeddingStatus"
        )::bigint AS "completedChunkCount",
        COUNT(e.*) FILTER (
          WHERE e."status" = ${ResourceChunkEmbeddingStatus.FAILED}::"ResourceChunkEmbeddingStatus"
        )::bigint AS "failedChunkCount"
      FROM eligible
      LEFT JOIN "ResourceChunkEmbedding" e
        ON e."resourceChunkId" = eligible."id"
       AND e."configurationId" = ${configurationId}
       AND e."contentHash" = eligible."contentHash"
    `;

    const updated = await this.prisma.resourceEmbeddingConfiguration.update({
      where: { id: configurationId },
      data: {
        eligibleChunkCount: Number(counts?.eligibleChunkCount ?? 0),
        completedChunkCount: Number(counts?.completedChunkCount ?? 0),
        failedChunkCount: Number(counts?.failedChunkCount ?? 0),
      },
    });

    return updated;
  }

  async markConfigurationReady(configurationId: string) {
    await this.recalculateCoverage(configurationId);
    return this.prisma.resourceEmbeddingConfiguration.update({
      where: { id: configurationId },
      data: { status: ResourceEmbeddingConfigurationStatus.READY },
    });
  }

  async activateConfiguration(input: {
    configurationId: string;
    minCoverageRatio: number;
  }) {
    const coverage = await this.recalculateCoverage(input.configurationId);
    const ratio =
      coverage.eligibleChunkCount === 0
        ? 1
        : coverage.completedChunkCount / coverage.eligibleChunkCount;

    if (coverage.failedChunkCount > 0 || ratio < input.minCoverageRatio) {
      throw new Error("Embedding configuration coverage is not sufficient.");
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.resourceEmbeddingConfiguration.findUnique({
        where: { id: input.configurationId },
      });
      if (!current) {
        throw new Error("Embedding configuration not found.");
      }

      await tx.resourceEmbeddingConfiguration.updateMany({
        where: {
          status: ResourceEmbeddingConfigurationStatus.ACTIVE,
          id: { not: input.configurationId },
        },
        data: {
          status: ResourceEmbeddingConfigurationStatus.RETIRED,
          retiredAt: new Date(),
        },
      });

      return tx.resourceEmbeddingConfiguration.update({
        where: { id: input.configurationId },
        data: {
          status: ResourceEmbeddingConfigurationStatus.ACTIVE,
          activatedAt: new Date(),
          retiredAt: null,
        },
      });
    });
  }
}

async function acquireOneLease(
  tx: TxClient,
  input: {
    configurationId: string;
    chunkId: string;
    contentHash: string;
    leasedUntil: Date;
  }
) {
  const id = randomUUID();
  const inserted = await tx.$queryRaw<ResourceChunkEmbedding[]>`
    INSERT INTO "ResourceChunkEmbedding" (
      "id",
      "resourceChunkId",
      "configurationId",
      "contentHash",
      "status",
      "attemptCount",
      "leasedUntil",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${id},
      ${input.chunkId},
      ${input.configurationId},
      ${input.contentHash},
      ${ResourceChunkEmbeddingStatus.PENDING}::"ResourceChunkEmbeddingStatus",
      1,
      ${input.leasedUntil},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("resourceChunkId", "configurationId", "contentHash") DO NOTHING
    RETURNING
      "id",
      "resourceChunkId",
      "configurationId",
      "contentHash",
      "status",
      "failureCode",
      "attemptCount",
      "leasedUntil",
      "createdAt",
      "updatedAt",
      "completedAt"
  `;
  if (inserted[0]) return inserted[0];

  const updated = await tx.$queryRaw<ResourceChunkEmbedding[]>`
    UPDATE "ResourceChunkEmbedding"
    SET
      "status" = ${ResourceChunkEmbeddingStatus.PENDING}::"ResourceChunkEmbeddingStatus",
      "failureCode" = NULL,
      "attemptCount" = "attemptCount" + 1,
      "leasedUntil" = ${input.leasedUntil},
      "completedAt" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "resourceChunkId" = ${input.chunkId}
      AND "configurationId" = ${input.configurationId}
      AND "contentHash" = ${input.contentHash}
      AND "status" <> ${ResourceChunkEmbeddingStatus.COMPLETED}::"ResourceChunkEmbeddingStatus"
      AND (
        "status" = ${ResourceChunkEmbeddingStatus.FAILED}::"ResourceChunkEmbeddingStatus"
        OR "leasedUntil" IS NULL
        OR "leasedUntil" < CURRENT_TIMESTAMP
      )
    RETURNING
      "id",
      "resourceChunkId",
      "configurationId",
      "contentHash",
      "status",
      "failureCode",
      "attemptCount",
      "leasedUntil",
      "createdAt",
      "updatedAt",
      "completedAt"
  `;

  return updated[0] ?? null;
}

function toVectorLiteral(vector: number[]) {
  return `[${vector.map((value) => Number(value).toPrecision(12)).join(",")}]`;
}
