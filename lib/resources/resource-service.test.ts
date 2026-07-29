import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ResourceApprovalStatus,
  ResourceExtractionQuality,
  ResourceProcessingStatus,
} from "@prisma/client";
import { buildResourceChunks, hashContent } from "./chunking";
import { extractDocument } from "./extraction";

const mocks = vi.hoisted(() => ({
  download: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  resourceCreate: vi.fn(),
  resourceFindFirst: vi.fn(),
  resourceFindUnique: vi.fn(),
  resourceUpdate: vi.fn(),
  resourceUpdateMany: vi.fn(),
  resourceChunkAggregate: vi.fn(),
  resourceChunkCount: vi.fn(),
  resourceChunkCreateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    resource: {
      create: mocks.resourceCreate,
      findFirst: mocks.resourceFindFirst,
      findUnique: mocks.resourceFindUnique,
      update: mocks.resourceUpdate,
      updateMany: mocks.resourceUpdateMany,
    },
    resourceChunk: {
      aggregate: mocks.resourceChunkAggregate,
      count: mocks.resourceChunkCount,
      createMany: mocks.resourceChunkCreateMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  getResourceStorageBucket: () => "resources-private",
  getSupabaseAdminClient: () => ({
    storage: {
      from: () => ({
        download: mocks.download,
        upload: mocks.upload,
        remove: mocks.remove,
      }),
    },
  }),
}));

import { ResourceService } from "./resource-service";

const markdown = "# Algebra\n\nQuestion 1. Solve x + 2 = 5.\nAnswer: x = 3";

describe("ResourceService processing lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resourceUpdateMany.mockResolvedValue({ count: 1 });
    mocks.resourceFindFirst.mockResolvedValue(null);
    mocks.resourceCreate.mockResolvedValue({ id: "resource-1" });
    mocks.resourceChunkAggregate.mockResolvedValue({ _max: { version: null } });
    mocks.resourceChunkCount.mockResolvedValue(0);
    mocks.resourceChunkCreateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        resource: { update: mocks.resourceUpdate },
        resourceChunk: { createMany: mocks.resourceChunkCreateMany },
      })
    );
    mocks.resourceFindUnique.mockResolvedValue({
      id: "resource-1",
      storageBucket: "resources-private",
      storagePath: "resources/resource-1/v1/file.md",
      mimeType: "text/markdown",
      originalFileName: "file.md",
      subjectId: null,
      topicId: null,
      activeChunkVersion: null,
      activeChunkSetHash: null,
    });
    mocks.resourceUpdate.mockResolvedValue({});
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
  });

  it("marks an initial acquired resource failed when private storage download fails", async () => {
    mocks.download.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    await expect(
      new ResourceService().processResource("resource-1")
    ).rejects.toMatchObject({
      code: "STORAGE_ERROR",
    });

    expect(mocks.resourceUpdate).toHaveBeenCalledWith({
      where: { id: "resource-1" },
      data: expect.objectContaining({
        processingStatus: ResourceProcessingStatus.FAILED,
        extractionQuality: ResourceExtractionQuality.FAILED,
        processingVersion: null,
        failureReason: "The private resource file could not be downloaded.",
        extractionWarnings: [
          "The private resource file could not be downloaded.",
        ],
        failedAt: expect.any(Date),
      }),
    });
  });

  it("keeps the previous active version address when reprocessing fails", async () => {
    mocks.resourceFindUnique.mockResolvedValue({
      id: "resource-1",
      storageBucket: "resources-private",
      storagePath: "resources/resource-1/v1/file.md",
      mimeType: "text/markdown",
      originalFileName: "file.md",
      subjectId: null,
      topicId: null,
      activeChunkVersion: 1,
      activeChunkSetHash: "existing",
    });
    mocks.resourceChunkAggregate.mockResolvedValue({ _max: { version: 1 } });
    mocks.download.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    await expect(
      new ResourceService().processResource("resource-1")
    ).rejects.toMatchObject({
      code: "STORAGE_ERROR",
    });

    expect(mocks.resourceUpdate).toHaveBeenLastCalledWith({
      where: { id: "resource-1" },
      data: expect.objectContaining({
        processingStatus: ResourceProcessingStatus.PROCESSED,
        processingVersion: null,
        failureReason: "The private resource file could not be downloaded.",
      }),
    });
  });

  it("activates a new chunk version only after successful processing", async () => {
    mocks.download.mockResolvedValue({
      data: new Blob([markdown]),
      error: null,
    });
    mocks.resourceUpdate.mockResolvedValue({ id: "resource-1" });

    await new ResourceService().processResource("resource-1");

    expect(mocks.resourceChunkCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          resourceId: "resource-1",
          version: 1,
          chunkIndex: 0,
        }),
      ]),
    });
    expect(mocks.resourceUpdate).toHaveBeenLastCalledWith({
      where: { id: "resource-1" },
      data: expect.objectContaining({
        activeChunkVersion: 1,
        activeChunkSetHash: expect.any(String),
        approvalStatus: ResourceApprovalStatus.PENDING_REVIEW,
        processingStatus: ResourceProcessingStatus.PROCESSED,
        processingVersion: null,
      }),
      include: {
        _count: { select: { chunks: true } },
      },
    });
  });

  it("does not create duplicate chunk versions when extracted content is unchanged", async () => {
    const chunks = buildResourceChunks({
      extraction: extractDocument({
        buffer: Buffer.from(markdown),
        mimeType: "text/markdown",
        fileName: "file.md",
      }),
    });
    const activeChunkSetHash = hashContent(
      JSON.stringify(
        chunks.map((chunk) => ({
          chunkIndex: chunk.chunkIndex,
          chunkType: chunk.chunkType,
          contentHash: chunk.contentHash,
        }))
      )
    );

    mocks.resourceFindUnique.mockResolvedValue({
      id: "resource-1",
      storageBucket: "resources-private",
      storagePath: "resources/resource-1/v1/file.md",
      mimeType: "text/markdown",
      originalFileName: "file.md",
      subjectId: null,
      topicId: null,
      activeChunkVersion: 1,
      activeChunkSetHash,
    });
    mocks.resourceChunkAggregate.mockResolvedValue({ _max: { version: 1 } });
    mocks.resourceChunkCount.mockResolvedValue(1);
    mocks.download.mockResolvedValue({
      data: new Blob([markdown]),
      error: null,
    });
    mocks.resourceUpdate.mockResolvedValue({ id: "resource-1" });

    await new ResourceService().processResource("resource-1");

    expect(mocks.resourceChunkCreateMany).not.toHaveBeenCalled();
    expect(mocks.resourceUpdate).toHaveBeenLastCalledWith({
      where: { id: "resource-1" },
      data: expect.not.objectContaining({
        activeChunkVersion: 2,
        approvalStatus: ResourceApprovalStatus.PENDING_REVIEW,
      }),
      include: {
        _count: { select: { chunks: true } },
      },
    });
  });

  it("rejects approval when a processed resource has no active chunk set", async () => {
    mocks.resourceFindUnique.mockResolvedValue({
      id: "resource-1",
      processingStatus: ResourceProcessingStatus.PROCESSED,
      extractionQuality: ResourceExtractionQuality.HIGH,
      activeChunkVersion: null,
    });

    await expect(
      new ResourceService().decideApproval("resource-1", "admin-1", {
        action: "APPROVE",
      })
    ).rejects.toMatchObject({ code: "RESOURCE_NOT_APPROVABLE" });
  });

  it("deletes the private object if database creation fails after upload", async () => {
    mocks.resourceCreate.mockRejectedValue(new Error("db unavailable"));

    await expect(
      new ResourceService().createUploadedResource(
        "admin-1",
        {
          name: "lesson.md",
          type: "text/markdown",
          size: 12,
          arrayBuffer: async () => Buffer.from("# Lesson").buffer,
        },
        {}
      )
    ).rejects.toMatchObject({ code: "INTERNAL_ERROR" });

    expect(mocks.remove).toHaveBeenCalledWith([
      expect.stringMatching(/^resources\/[-a-f0-9]+\/v1\/\d+-lesson\.md$/),
    ]);
  });
});
