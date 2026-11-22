import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructed: vi.fn(),
  datamodel: { models: [{ name: "User", fields: ["id"] }] },
}));

vi.mock("@prisma/client", () => ({
  Prisma: {
    prismaVersion: { client: "synthetic-version" },
    get dmmf() { return { datamodel: mocks.datamodel }; },
  },
  PrismaClient: class {
    $disconnect = vi.fn().mockResolvedValue(undefined);
    aiChatMessageReport = mocks.datamodel.models.some((model) => model.name === "AiChatMessageReport") ? {} : undefined;
    constructor() { mocks.constructed(); }
  },
}));

type CachedClient = { $disconnect: ReturnType<typeof vi.fn>; aiChatMessageReport?: unknown };
const cache = globalThis as typeof globalThis & { prisma?: CachedClient; prismaSchema?: string };

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  delete cache.prisma;
  delete cache.prismaSchema;
  mocks.datamodel = { models: [{ name: "User", fields: ["id"] }] };
});
afterEach(() => {
  delete cache.prisma;
  delete cache.prismaSchema;
  vi.unstubAllEnvs();
});

describe("development Prisma client cache", () => {
  it("reuses the client through hot reload when the generated schema has not changed", async () => {
    const first = (await import("./prisma")).prisma;
    vi.resetModules();
    const reloaded = (await import("./prisma")).prisma;
    expect(reloaded).toBe(first);
    expect(mocks.constructed).toHaveBeenCalledTimes(1);
    expect(first.$disconnect).not.toHaveBeenCalled();
  });

  it("replaces a cached client after generation adds the report model", async () => {
    const first = (await import("./prisma")).prisma;
    expect(first.aiChatMessageReport).toBeUndefined();
    mocks.datamodel.models.push({ name: "AiChatMessageReport", fields: ["id", "messageId"] });
    vi.resetModules();
    const regenerated = (await import("./prisma")).prisma;
    expect(regenerated).not.toBe(first);
    expect(regenerated.aiChatMessageReport).toBeDefined();
    expect(first.$disconnect).toHaveBeenCalledOnce();
    expect(cache.prisma).toBe(regenerated);
  });

  it("also invalidates the client when fields change without adding a model", async () => {
    const first = (await import("./prisma")).prisma;
    mocks.datamodel.models[0].fields.push("displayName");
    vi.resetModules();
    expect((await import("./prisma")).prisma).not.toBe(first);
    expect(first.$disconnect).toHaveBeenCalledOnce();
  });

  it("discards a legacy cache created before schema-aware caching was introduced", async () => {
    const stale = { $disconnect: vi.fn().mockResolvedValue(undefined) };
    cache.prisma = stale;
    expect((await import("./prisma")).prisma).not.toBe(stale);
    expect(stale.$disconnect).toHaveBeenCalledOnce();
  });

  it("does not reuse or modify a development cache in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const stale = { $disconnect: vi.fn().mockResolvedValue(undefined) };
    cache.prisma = stale;
    expect((await import("./prisma")).prisma).not.toBe(stale);
    expect(cache.prisma).toBe(stale);
    expect(stale.$disconnect).not.toHaveBeenCalled();
    expect(cache.prismaSchema).toBeUndefined();
  });
});
