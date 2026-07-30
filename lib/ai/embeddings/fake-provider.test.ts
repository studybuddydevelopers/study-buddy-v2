import { describe, expect, it } from "vitest";
import { EmbeddingProviderError } from "./errors";
import { FakeEmbeddingProvider } from "./fake-provider";

describe("FakeEmbeddingProvider", () => {
  it("returns deterministic embeddings with the configured dimensions", async () => {
    const provider = new FakeEmbeddingProvider({ dimensions: 8 });

    const first = await provider.embedQuery("quadratic equations");
    const second = await provider.embedQuery("quadratic equations");

    expect(first).toHaveLength(8);
    expect(second).toEqual(first);
  });

  it("makes lexical overlap closer than unrelated text for runtime acceptance", async () => {
    const provider = new FakeEmbeddingProvider({ dimensions: 64 });

    const query = await provider.embedQuery("quadrtic formula");
    const matching = await provider.embedQuery("quadratic formula equation");
    const unrelated = await provider.embedQuery("cell membrane diffusion");

    expect(cosineDistance(query, matching)).toBeLessThan(
      cosineDistance(query, unrelated)
    );
  });

  it("supports controlled provider failures without paid API calls", async () => {
    const provider = new FakeEmbeddingProvider({
      mode: "FAILURE",
      failureCode: "RATE_LIMITED",
    });

    await expect(provider.embedDocuments(["one"])).rejects.toMatchObject({
      failureCode: "RATE_LIMITED",
    } satisfies Partial<EmbeddingProviderError>);
  });

  it("can return malformed output modes for service validation tests", async () => {
    const countMismatch = new FakeEmbeddingProvider({
      dimensions: 4,
      mode: "COUNT_MISMATCH",
    });
    const dimensionMismatch = new FakeEmbeddingProvider({
      dimensions: 4,
      mode: "DIMENSION_MISMATCH",
    });
    const nonFinite = new FakeEmbeddingProvider({
      dimensions: 4,
      mode: "NON_FINITE",
    });

    await expect(
      countMismatch.embedDocuments(["a", "b"])
    ).resolves.toHaveLength(1);
    await expect(dimensionMismatch.embedQuery("a")).resolves.toHaveLength(3);
    expect((await nonFinite.embedQuery("a")).some(Number.isNaN)).toBe(true);
  });
});

function cosineDistance(a: number[], b: number[]) {
  const dot = a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
  const aMagnitude = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const bMagnitude = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  return 1 - dot / (aMagnitude * bMagnitude);
}
