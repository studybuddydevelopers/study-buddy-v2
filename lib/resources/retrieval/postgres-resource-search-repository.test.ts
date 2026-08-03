import {
  ResourceChunkType,
  ResourceEmbeddingConfigurationStatus,
  ResourceSourceKind,
} from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PostgresResourceSearchRepository } from "./postgres-resource-search-repository";

describe("PostgresResourceSearchRepository", () => {
  it("runs keyword retrieval without requiring an embedding configuration", async () => {
    const prisma = fakePrisma({
      queryRows: [row("chunk-1")],
      activeConfig: null,
    });
    const repository = new PostgresResourceSearchRepository(prisma);

    const results = await repository.keywordSearch({ query: "question 5" });

    expect(results).toHaveLength(1);
    expect(results[0]?.keywordRank).toBe(1);
    expect(prisma.resourceEmbeddingConfiguration.findFirstCalls).toBe(0);
  });

  it("collects exact formula, phrase, unit, year, and question signals for keyword retrieval", async () => {
    const prisma = fakePrisma({
      queryRows: [
        row("chunk-1", {
          title: "Ohm's law",
          content:
            "Physics 2021 Question 5. Ohm's law states V = I x R and voltage is measured in volts.",
          questionNumber: "5",
        }),
      ],
      activeConfig: null,
    });
    const repository = new PostgresResourceSearchRepository(prisma);

    const results = await repository.keywordSearch({
      query: "Physics 2021 Question 5: teach me Ohm's law, V = I x R, and volts.",
    });

    expect(results[0]?.exactSignals).toEqual(
      expect.arrayContaining([
        "year:2021",
        "question:5",
        "phrase:ohm's law",
        "expression:V = I x R",
        "unit:volts",
      ])
    );
  });

  it("requires an active embedding configuration for vector retrieval", async () => {
    const repository = new PostgresResourceSearchRepository(
      fakePrisma({ activeConfig: null })
    );

    await expect(
      repository.vectorSearch({ queryEmbedding: [1, 2, 3, 4] })
    ).rejects.toMatchObject({
      code: "NO_ACTIVE_EMBEDDING_CONFIGURATION",
    });
  });

  it("rejects vector dimension mismatches", async () => {
    const repository = new PostgresResourceSearchRepository(
      fakePrisma({ activeConfig: config() })
    );

    await expect(
      repository.vectorSearch({ queryEmbedding: [1, 2] })
    ).rejects.toMatchObject({
      code: "DIMENSION_MISMATCH",
    });
  });

  it("runs exact vector search against completed active-config embeddings", async () => {
    const prisma = fakePrisma({
      activeConfig: config(),
      queryRows: [row("chunk-1", { vectorDistance: 0.2 })],
    });
    const repository = new PostgresResourceSearchRepository(prisma);

    const results = await repository.vectorSearch({
      queryEmbedding: [0.1, 0.2, 0.3, 0.4],
    });

    expect(results[0]?.vectorRank).toBe(1);
    expect(results[0]?.vectorDistance).toBe(0.2);
    expect(prisma.queryCalls).toBe(1);
  });

  it("keeps keyword-only hybrid candidates when no query embedding exists", async () => {
    const repository = new PostgresResourceSearchRepository(
      fakePrisma({ queryRows: [row("chunk-1")] })
    );

    const results = await repository.hybridSearch({
      query: "linear equations",
      limit: 5,
    });

    expect(results.map((result) => result.id)).toEqual(["chunk-1"]);
  });

  it("uses an explicit integer expression for empty exact-signal sorting", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "postgres-resource-search-repository.ts"),
      "utf8"
    );

    expect(source).toContain("Prisma.sql`0::integer`");
  });
});

function fakePrisma(options: {
  queryRows?: ReturnType<typeof row>[];
  activeConfig?: ReturnType<typeof config> | null;
} = {}) {
  const state = { queryCalls: 0 };
  const resourceEmbeddingConfiguration = {
    findFirstCalls: 0,
    async findFirst() {
      resourceEmbeddingConfiguration.findFirstCalls += 1;
      return options.activeConfig ?? null;
    },
  };

  return {
    get queryCalls() {
      return state.queryCalls;
    },
    async $queryRaw() {
      state.queryCalls += 1;
      return options.queryRows ?? [];
    },
    subject: {
      findUnique: async () => null,
    },
    topic: {
      findUnique: async () => null,
    },
    resourceEmbeddingConfiguration,
  } as unknown as ConstructorParameters<
    typeof PostgresResourceSearchRepository
  >[0] & {
    queryCalls: number;
    resourceEmbeddingConfiguration: typeof resourceEmbeddingConfiguration;
  };
}

function config() {
  const now = new Date();
  return {
    id: "config-1",
    provider: "fake",
    model: "fake",
    dimensions: 4,
    embeddingVersion: 1,
    status: ResourceEmbeddingConfigurationStatus.ACTIVE,
    eligibleChunkCount: 1,
    completedChunkCount: 1,
    failedChunkCount: 0,
    createdAt: now,
    updatedAt: now,
    activatedAt: now,
    retiredAt: null,
  };
}

function row(
  id: string,
  overrides: {
    keywordScore?: number | null;
    vectorDistance?: number | null;
    title?: string | null;
    content?: string;
    questionNumber?: string | null;
  } = {}
) {
  return {
    id,
    resourceId: "resource-1",
    resourceTitle: "Resource 1",
    sourceKind: ResourceSourceKind.UPLOAD,
    chunkIndex: 0,
    chunkType: ResourceChunkType.CONTENT_SECTION,
    title: overrides.title ?? null,
    content: overrides.content ?? `Question 5 content ${id}`,
    contentHash: `${id}-hash`,
    subjectId: null,
    topicId: null,
    questionNumber: overrides.questionNumber ?? "5",
    keywordScore: overrides.keywordScore ?? 0.7,
    vectorDistance: overrides.vectorDistance ?? null,
  };
}
