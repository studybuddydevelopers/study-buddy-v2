import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmbeddingProviderError } from "./errors";

const openAiMock = vi.hoisted(() => ({
  constructorOptions: [] as unknown[],
  embeddingCalls: [] as Array<Record<string, unknown>>,
  queryRaw: vi.fn(),
  executeRaw: vi.fn(),
}));

vi.mock("openai", () => {
  class MockOpenAI {
    embeddings = {
      create: vi.fn(async (request: Record<string, unknown>) => {
        openAiMock.embeddingCalls.push(request);
        const input = Array.isArray(request.input) ? request.input : [request.input];
        return {
          data: input.map((_, index) => ({
            index,
            embedding: Array.from({ length: Number(request.dimensions) }, (_value, offset) =>
              index + offset / 1000
            ),
          })),
          usage: { total_tokens: input.length * 3 },
        };
      }),
    };

    constructor(options: unknown) {
      openAiMock.constructorOptions.push(options);
    }
  }

  return { default: MockOpenAI };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: openAiMock.queryRaw,
    $executeRaw: openAiMock.executeRaw,
  },
}));

import {
  OpenAIEmbeddingProvider,
  orderedEmbeddingsFromResponse,
} from "./openai-provider";

describe("OpenAIEmbeddingProvider response ordering", () => {
  it("preserves ordered response indices", () => {
    expect(
      orderedEmbeddingsFromResponse(
        [
          { index: 0, embedding: [1, 1] },
          { index: 1, embedding: [2, 2] },
          { index: 2, embedding: [3, 3] },
        ],
        3,
        2
      )
    ).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  it("reorders reversed response indices to caller input order", () => {
    expect(
      orderedEmbeddingsFromResponse(
        [
          { index: 2, embedding: [3, 3] },
          { index: 1, embedding: [2, 2] },
          { index: 0, embedding: [1, 1] },
        ],
        3,
        2
      )
    ).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  it("reorders arbitrary response permutations to caller input order", () => {
    expect(
      orderedEmbeddingsFromResponse(
        [
          { index: 1, embedding: [2, 2] },
          { index: 2, embedding: [3, 3] },
          { index: 0, embedding: [1, 1] },
        ],
        3,
        2
      )
    ).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  it.each([
    {
      name: "duplicate index",
      data: [
        { index: 0, embedding: [1, 1] },
        { index: 1, embedding: [2, 2] },
        { index: 1, embedding: [3, 3] },
      ],
      expectedCount: 3,
    },
    {
      name: "missing index",
      data: [
        { index: 0, embedding: [1, 1] },
        { index: 2, embedding: [3, 3] },
      ],
      expectedCount: 3,
    },
    {
      name: "out-of-range index",
      data: [
        { index: 0, embedding: [1, 1] },
        { index: 1, embedding: [2, 2] },
        { index: 3, embedding: [3, 3] },
      ],
      expectedCount: 3,
    },
    {
      name: "negative index",
      data: [
        { index: 0, embedding: [1, 1] },
        { index: -1, embedding: [2, 2] },
      ],
      expectedCount: 2,
    },
    {
      name: "cardinality mismatch",
      data: [{ index: 0, embedding: [1, 1] }],
      expectedCount: 2,
    },
    {
      name: "non-integer index",
      data: [{ index: 0.5, embedding: [1, 1] }],
      expectedCount: 1,
    },
    {
      name: "missing index",
      data: [{ embedding: [1, 1] }],
      expectedCount: 1,
    },
    {
      name: "missing embedding",
      data: [{ index: 0 }],
      expectedCount: 1,
    },
    {
      name: "wrong dimensions",
      data: [{ index: 0, embedding: [1] }],
      expectedCount: 1,
    },
    {
      name: "non-finite value",
      data: [{ index: 0, embedding: [1, Number.NaN] }],
      expectedCount: 1,
    },
  ])("fails closed on malformed response: $name", ({ data, expectedCount }) => {
    expect(() =>
      orderedEmbeddingsFromResponse(data, expectedCount, 2)
    ).toThrow(EmbeddingProviderError);
  });

  it("preserves one-input index zero behavior", () => {
    expect(
      orderedEmbeddingsFromResponse([{ index: 0, embedding: [7, 8] }], 1, 2)
    ).toEqual([[7, 8]]);
  });
});

describe("OpenAIEmbeddingProvider boundary contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    vi.stubEnv("AI_EMBEDDING_MODEL", "text-embedding-3-small");
    vi.stubEnv("AI_EMBEDDING_DIMENSIONS", "1536");
    vi.stubEnv("OPENAI_TIMEOUT_MS", "25000");
    vi.stubEnv("AI_GLOBAL_BUDGET_ENABLED", "false");
    openAiMock.constructorOptions.length = 0;
    openAiMock.embeddingCalls.length = 0;
    openAiMock.queryRaw.mockReset();
    openAiMock.executeRaw.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("sends unchanged embedding request semantics and returns index-ordered vectors", async () => {
    const provider = new OpenAIEmbeddingProvider({
      apiKey: "test-openai-key",
      model: "text-embedding-3-small",
      dimensions: 3,
    });

    const vectors = await provider.embedDocuments(["A", "B", "C"]);

    expect(openAiMock.embeddingCalls).toEqual([
      {
        model: "text-embedding-3-small",
        input: ["A", "B", "C"],
        dimensions: 3,
      },
    ]);
    expect(vectors).toEqual([
      [0, 0.001, 0.002],
      [1, 1.001, 1.002],
      [2, 2.001, 2.002],
    ]);
  });

  it("preserves request payload and output values when budget is allowed", async () => {
    vi.stubEnv("AI_GLOBAL_BUDGET_ENABLED", "true");
    vi.stubEnv("AI_GLOBAL_DAILY_TOKEN_BUDGET", "1000000");
    openAiMock.queryRaw.mockResolvedValue([{ reservedTokens: 1000 }]);
    openAiMock.executeRaw.mockResolvedValue(1);
    const provider = new OpenAIEmbeddingProvider({
      apiKey: "test-openai-key",
      model: "text-embedding-3-small",
      dimensions: 3,
    });

    const vectors = await provider.embedDocuments(["A", "B"]);

    expect(openAiMock.queryRaw).toHaveBeenCalledTimes(1);
    expect(openAiMock.executeRaw).toHaveBeenCalledTimes(1);
    expect(openAiMock.embeddingCalls).toEqual([
      {
        model: "text-embedding-3-small",
        input: ["A", "B"],
        dimensions: 3,
      },
    ]);
    expect(vectors).toEqual([
      [0, 0.001, 0.002],
      [1, 1.001, 1.002],
    ]);
  });

  it("does not enter provider when budget reservation is exhausted", async () => {
    vi.stubEnv("AI_GLOBAL_BUDGET_ENABLED", "true");
    vi.stubEnv("AI_GLOBAL_DAILY_TOKEN_BUDGET", "1000000");
    openAiMock.queryRaw.mockResolvedValue([]);
    const provider = new OpenAIEmbeddingProvider({
      apiKey: "test-openai-key",
      model: "text-embedding-3-small",
      dimensions: 3,
    });

    await expect(provider.embedDocuments(["A", "B"])).rejects.toMatchObject({
      failureCode: "RATE_LIMITED",
    });
    expect(openAiMock.embeddingCalls).toHaveLength(0);
  });
});
