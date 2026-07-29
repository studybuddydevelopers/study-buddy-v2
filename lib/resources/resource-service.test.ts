import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ResourceExtractionQuality,
  ResourceProcessingStatus,
} from "@prisma/client";

const mocks = vi.hoisted(() => ({
  download: vi.fn(),
  resourceFindUnique: vi.fn(),
  resourceUpdate: vi.fn(),
  resourceUpdateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    resource: {
      findUnique: mocks.resourceFindUnique,
      update: mocks.resourceUpdate,
      updateMany: mocks.resourceUpdateMany,
    },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  getResourceStorageBucket: () => "resources-private",
  getSupabaseAdminClient: () => ({
    storage: {
      from: () => ({
        download: mocks.download,
      }),
    },
  }),
}));

import { ResourceService } from "./resource-service";

describe("ResourceService processing lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resourceUpdateMany.mockResolvedValue({ count: 1 });
    mocks.resourceFindUnique.mockResolvedValue({
      id: "resource-1",
      storageBucket: "resources-private",
      storagePath: "resources/resource-1/v1/file.md",
      mimeType: "text/markdown",
      originalFileName: "file.md",
      subjectId: null,
      topicId: null,
    });
    mocks.resourceUpdate.mockResolvedValue({});
  });

  it("marks an acquired resource failed when private storage download fails", async () => {
    mocks.download.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    await expect(new ResourceService().processResource("resource-1")).rejects.toMatchObject({
      code: "STORAGE_ERROR",
    });

    expect(mocks.resourceUpdate).toHaveBeenCalledWith({
      where: { id: "resource-1" },
      data: expect.objectContaining({
        processingStatus: ResourceProcessingStatus.FAILED,
        extractionQuality: ResourceExtractionQuality.FAILED,
        failureReason: "The private resource file could not be downloaded.",
        extractionWarnings: ["The private resource file could not be downloaded."],
        failedAt: expect.any(Date),
      }),
    });
  });
});
