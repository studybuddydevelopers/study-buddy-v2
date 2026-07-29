import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  Prisma,
  ResourceApprovalStatus,
  ResourceExtractionQuality,
  ResourceProcessingStatus,
  ResourceSourceKind,
  type Resource,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getResourceStorageBucket,
  getSupabaseAdminClient,
} from "@/lib/supabase/admin";
import { getPaginationMeta } from "@/lib/pagination";
import { hashContent, buildResourceChunks } from "./chunking";
import { extractDocument } from "./extraction";
import { ResourceServiceError } from "./errors";
import type {
  ListResourcesInput,
  ResourceApprovalInput,
} from "./schemas";

interface FileLike {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface CreateUploadedResourceInput {
  title?: string | null;
  description?: string | null;
  subjectId?: string | null;
  topicId?: string | null;
  provenance?: string | null;
  usageRights?: string | null;
}

const MAX_RESOURCE_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export class ResourceService {
  async listResources(input: ListResourcesInput) {
    const where: Prisma.ResourceWhereInput = {
      ...(input.sourceKind ? { sourceKind: input.sourceKind } : {}),
      ...(input.processingStatus
        ? { processingStatus: input.processingStatus }
        : {}),
      ...(input.approvalStatus ? { approvalStatus: input.approvalStatus } : {}),
      ...(input.subjectId ? { subjectId: input.subjectId } : {}),
      ...(input.topicId ? { topicId: input.topicId } : {}),
    };

    const [total, resources] = await prisma.$transaction([
      prisma.resource.count({ where }),
      prisma.resource.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          subject: { select: { id: true, name: true, examCode: true } },
          topic: { select: { id: true, title: true, subjectId: true } },
          _count: { select: { chunks: true } },
        },
      }),
    ]);

    return {
      resources,
      pagination: getPaginationMeta(total, input.page, input.pageSize),
    };
  }

  async getResource(resourceId: string) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        subject: { select: { id: true, name: true, examCode: true } },
        topic: { select: { id: true, title: true, subjectId: true } },
      },
    });

    if (!resource) {
      throw new ResourceServiceError(
        "RESOURCE_NOT_FOUND",
        "Resource not found."
      );
    }

    const chunks = resource.activeChunkVersion
      ? await prisma.resourceChunk.findMany({
          where: {
            resourceId,
            version: resource.activeChunkVersion,
          },
          orderBy: [{ chunkIndex: "asc" }],
          take: 100,
        })
      : [];

    return { resource: { ...resource, chunks } };
  }

  async createUploadedResource(
    uploadedById: string,
    file: FileLike,
    input: CreateUploadedResourceInput
  ) {
    validateUpload(file);
    await this.validateSubjectTopic(input.subjectId, input.topicId);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = getFileMimeType(file);
    const contentHash = hashContent(buffer);
    const title = cleanTitle(input.title || file.name);
    const version = await this.nextVersion({
      sourceKind: ResourceSourceKind.UPLOAD,
      title,
      subjectId: input.subjectId ?? null,
      topicId: input.topicId ?? null,
    });
    const resourceId = randomUUID();
    const bucket = getResourceStorageBucket();
    const storagePath = buildStoragePath(resourceId, version, file.name);

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new ResourceServiceError(
        "STORAGE_ERROR",
        "The resource file could not be stored privately."
      );
    }

    try {
      const duplicate = await prisma.resource.findFirst({
        where: { contentHash },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true },
      });

      const resource = await prisma.resource.create({
        data: {
          id: resourceId,
          sourceKind: ResourceSourceKind.UPLOAD,
          title,
          description: emptyToNull(input.description),
          subjectId: input.subjectId ?? null,
          topicId: input.topicId ?? null,
          uploadedById,
          storageBucket: bucket,
          storagePath,
          originalFileName: file.name,
          mimeType,
          byteSize: file.size,
          contentHash,
          version,
          processingStatus: ResourceProcessingStatus.UPLOADED,
          approvalStatus: ResourceApprovalStatus.PENDING_REVIEW,
          provenance: emptyToNull(input.provenance),
          usageRights: emptyToNull(input.usageRights),
          duplicateOfResourceId: duplicate?.id ?? null,
          extractionWarnings: duplicate
            ? (["Potential duplicate content hash; admin review required."] as Prisma.InputJsonValue)
            : undefined,
        },
      });

      return { resource };
    } catch (error) {
      await removePrivateResourceObject(bucket, storagePath);
      if (error instanceof ResourceServiceError) throw error;
      throw new ResourceServiceError(
        "INTERNAL_ERROR",
        "The resource record could not be created."
      );
    }
  }

  async processResource(resourceId: string) {
    const acquired = await prisma.resource.updateMany({
      where: {
        id: resourceId,
        processingStatus: {
          not: ResourceProcessingStatus.PROCESSING,
        },
      },
      data: {
        processingStatus: ResourceProcessingStatus.PROCESSING,
        failureReason: null,
        failedAt: null,
      },
    });

    if (acquired.count !== 1) {
      const existing = await prisma.resource.findUnique({
        where: { id: resourceId },
      });
      if (!existing) {
        throw new ResourceServiceError(
          "RESOURCE_NOT_FOUND",
          "Resource not found."
        );
      }
      throw new ResourceServiceError(
        "RESOURCE_NOT_PROCESSABLE",
        "Resource processing is already in progress."
      );
    }

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource?.storageBucket || !resource.storagePath) {
      await this.markProcessingFailed(
        resourceId,
        "Resource does not have a private storage object."
      );
      throw new ResourceServiceError(
        "RESOURCE_NOT_PROCESSABLE",
        "Resource does not have a private storage object."
      );
    }

    const nextChunkVersion = await this.nextChunkVersion(resourceId);
    await prisma.resource.update({
      where: { id: resourceId },
      data: { processingVersion: nextChunkVersion },
    });

    try {
      const buffer = await downloadPrivateResource(resource);
      const extraction = extractDocument({
        buffer,
        mimeType: resource.mimeType,
        fileName: resource.originalFileName,
      });
      const chunks = buildResourceChunks({
        extraction,
        subjectId: resource.subjectId,
        topicId: resource.topicId,
      });

      if (chunks.length === 0 || !extraction.text.trim()) {
        await this.markProcessingFailed(
          resourceId,
          extraction.warnings.join(" ") || "No usable text was extracted."
        );
        throw new ResourceServiceError(
          "EXTRACTION_FAILED",
          "No usable text could be extracted from this resource."
        );
      }

      const chunkSetHash = hashChunkSet(chunks);
      const hasActiveChunks =
        resource.activeChunkVersion === null
          ? false
          : (await prisma.resourceChunk.count({
              where: {
                resourceId,
                version: resource.activeChunkVersion,
              },
            })) > 0;
      const unchangedActiveChunkSet =
        hasActiveChunks && resource.activeChunkSetHash === chunkSetHash;

      const processed = await prisma.$transaction(async (tx) => {
        if (unchangedActiveChunkSet) {
          return tx.resource.update({
            where: { id: resourceId },
            data: {
              processingStatus: ResourceProcessingStatus.PROCESSED,
              extractionQuality: extraction.quality,
              extractionWarnings: extraction.warnings as Prisma.InputJsonValue,
              processedAt: new Date(),
              failedAt: null,
              failureReason: null,
              processingVersion: null,
            },
            include: {
              _count: { select: { chunks: true } },
            },
          });
        }

        await tx.resourceChunk.createMany({
          data: chunks.map((chunk) => ({
            resourceId,
            version: nextChunkVersion,
            subjectId: resource.subjectId,
            topicId: resource.topicId,
            chunkType: chunk.chunkType,
            chunkIndex: chunk.chunkIndex,
            title: chunk.title ?? null,
            content: chunk.content,
            tokenEstimate: chunk.tokenEstimate,
            pageStart: chunk.pageStart ?? null,
            pageEnd: chunk.pageEnd ?? null,
            questionNumber: chunk.questionNumber ?? null,
            contentHash: chunk.contentHash,
            metadata: chunk.metadata as Prisma.InputJsonValue,
          })),
        });
        return tx.resource.update({
          where: { id: resourceId },
          data: {
            version: nextChunkVersion,
            activeChunkVersion: nextChunkVersion,
            activeChunkSetHash: chunkSetHash,
            processingVersion: null,
            processingStatus: ResourceProcessingStatus.PROCESSED,
            approvalStatus: ResourceApprovalStatus.PENDING_REVIEW,
            extractionQuality: extraction.quality,
            extractionWarnings: extraction.warnings as Prisma.InputJsonValue,
            processedAt: new Date(),
            failedAt: null,
            failureReason: null,
            approvedById: null,
            approvedAt: null,
            rejectedAt: null,
            approvalNotes: null,
          },
          include: {
            _count: { select: { chunks: true } },
          },
        });
      });

      return { resource: processed };
    } catch (error) {
      if (error instanceof ResourceServiceError) {
        await this.markProcessingFailed(resourceId, error.message);
        throw error;
      }
      await this.markProcessingFailed(
        resourceId,
        "Resource processing failed."
      );
      throw new ResourceServiceError(
        "INTERNAL_ERROR",
        "Resource processing failed."
      );
    }
  }

  async decideApproval(
    resourceId: string,
    adminUserId: string,
    input: ResourceApprovalInput
  ) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new ResourceServiceError(
        "RESOURCE_NOT_FOUND",
        "Resource not found."
      );
    }

    if (
      input.action === "APPROVE" &&
      resource.processingStatus !== ResourceProcessingStatus.PROCESSED
    ) {
      throw new ResourceServiceError(
        "RESOURCE_NOT_APPROVABLE",
        "Only successfully processed resources can be approved."
      );
    }

    if (input.action === "APPROVE") {
      if (
        !resource.activeChunkVersion ||
        resource.extractionQuality === ResourceExtractionQuality.FAILED
      ) {
        throw new ResourceServiceError(
          "RESOURCE_NOT_APPROVABLE",
          "Only resources with usable active chunks can be approved."
        );
      }

      const activeChunkCount = await prisma.resourceChunk.count({
        where: {
          resourceId,
          version: resource.activeChunkVersion,
        },
      });

      if (activeChunkCount < 1) {
        throw new ResourceServiceError(
          "RESOURCE_NOT_APPROVABLE",
          "Only resources with usable active chunks can be approved."
        );
      }
    }

    const now = new Date();
    const approved = input.action === "APPROVE";
    const updated = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        approvalStatus: approved
          ? ResourceApprovalStatus.APPROVED
          : ResourceApprovalStatus.REJECTED,
        approvedById: adminUserId,
        approvedAt: approved ? now : null,
        rejectedAt: approved ? null : now,
        approvalNotes: input.notes?.trim() || null,
      },
    });

    return { resource: updated };
  }

  async validateSubjectTopic(subjectId?: string | null, topicId?: string | null) {
    if (topicId && !subjectId) {
      throw new ResourceServiceError(
        "INVALID_SUBJECT_TOPIC",
        "A topic cannot be assigned without a subject."
      );
    }

    if (subjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: subjectId },
        select: { id: true },
      });
      if (!subject) {
        throw new ResourceServiceError(
          "INVALID_SUBJECT_TOPIC",
          "Subject not found."
        );
      }
    }

    if (topicId) {
      const topic = await prisma.topic.findUnique({
        where: { id: topicId },
        select: { id: true, subjectId: true },
      });
      if (!topic || topic.subjectId !== subjectId) {
        throw new ResourceServiceError(
          "INVALID_SUBJECT_TOPIC",
          "Topic must belong to the selected subject."
        );
      }
    }
  }

  private async nextVersion(input: {
    sourceKind: ResourceSourceKind;
    title: string;
    subjectId: string | null;
    topicId: string | null;
  }) {
    const existing = await prisma.resource.findFirst({
      where: {
        sourceKind: input.sourceKind,
        title: input.title,
        subjectId: input.subjectId,
        topicId: input.topicId,
      },
      orderBy: [{ version: "desc" }],
      select: { version: true },
    });

    return (existing?.version ?? 0) + 1;
  }

  private async markProcessingFailed(resourceId: string, reason: string) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { activeChunkVersion: true },
    });
    const hasActiveVersion = Boolean(resource?.activeChunkVersion);

    await prisma.resource.update({
      where: { id: resourceId },
      data: {
        processingStatus: hasActiveVersion
          ? ResourceProcessingStatus.PROCESSED
          : ResourceProcessingStatus.FAILED,
        ...(!hasActiveVersion
          ? { extractionQuality: ResourceExtractionQuality.FAILED }
          : {}),
        processingVersion: null,
        extractionWarnings: [reason] as Prisma.InputJsonValue,
        failureReason: reason,
        failedAt: new Date(),
      },
    });
  }

  private async nextChunkVersion(resourceId: string) {
    const result = await prisma.resourceChunk.aggregate({
      where: { resourceId },
      _max: { version: true },
    });

    return (result._max.version ?? 0) + 1;
  }
}

let singleton: ResourceService | null = null;

export function getResourceService() {
  singleton ??= new ResourceService();
  return singleton;
}

function validateUpload(file: FileLike) {
  if (!file.name || file.size <= 0) {
    throw new ResourceServiceError(
      "INVALID_INPUT",
      "A non-empty resource file is required."
    );
  }
  if (file.size > MAX_RESOURCE_UPLOAD_BYTES) {
    throw new ResourceServiceError(
      "INVALID_INPUT",
      "Resource files must be 25 MB or smaller."
    );
  }
  if (!ALLOWED_MIME_TYPES.has(getFileMimeType(file))) {
    throw new ResourceServiceError(
      "INVALID_INPUT",
      "Only PDF, DOCX, Markdown, and plain-text resources are supported."
    );
  }
}

function getFileMimeType(file: FileLike) {
  if (ALLOWED_MIME_TYPES.has(file.type)) return file.type;

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".txt")) return "text/plain";
  if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) {
    return "text/markdown";
  }
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return file.type;
}

function cleanTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 180) || "Untitled resource";
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildStoragePath(resourceId: string, version: number, fileName: string) {
  const parsed = path.parse(fileName);
  const base = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  const extension = parsed.ext.toLowerCase().replace(/[^.a-z0-9]/g, "");
  return `resources/${resourceId}/v${version}/${Date.now()}-${base || "file"}${extension}`;
}

async function downloadPrivateResource(resource: Resource) {
  if (!resource.storageBucket || !resource.storagePath) {
    throw new ResourceServiceError(
      "RESOURCE_NOT_PROCESSABLE",
      "Resource does not have a private storage object."
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(resource.storageBucket)
    .download(resource.storagePath);

  if (error || !data) {
    throw new ResourceServiceError(
      "STORAGE_ERROR",
      "The private resource file could not be downloaded."
    );
  }

  return Buffer.from(await data.arrayBuffer());
}

async function removePrivateResourceObject(bucket: string, storagePath: string) {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.storage.from(bucket).remove([storagePath]);
    if (error) {
      console.warn("Resource upload compensation cleanup failed.");
    }
  } catch {
    console.warn("Resource upload compensation cleanup failed.");
  }
}

function hashChunkSet(chunks: Array<{ chunkIndex: number; chunkType: string; contentHash: string }>) {
  return hashContent(
    JSON.stringify(
      chunks
        .map((chunk) => ({
          chunkIndex: chunk.chunkIndex,
          chunkType: chunk.chunkType,
          contentHash: chunk.contentHash,
        }))
        .sort((a, b) => a.chunkIndex - b.chunkIndex)
    )
  );
}
