import { z } from "zod";
import {
  ResourceApprovalStatus,
  ResourceProcessingStatus,
  ResourceSourceKind,
} from "@prisma/client";

export const resourceApprovalSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  notes: z.string().trim().max(2000).optional(),
});

export const migratePastQuestionsSchema = z.object({
  dryRun: z.boolean().default(true),
  limit: z.number().int().positive().max(1000).optional(),
});

export const listResourcesQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(50).default(20),
  sourceKind: z.nativeEnum(ResourceSourceKind).optional(),
  processingStatus: z.nativeEnum(ResourceProcessingStatus).optional(),
  approvalStatus: z.nativeEnum(ResourceApprovalStatus).optional(),
  subjectId: z.string().uuid().optional(),
  topicId: z.string().uuid().optional(),
});

export type ResourceApprovalInput = z.infer<typeof resourceApprovalSchema>;
export type MigratePastQuestionsInput = z.infer<typeof migratePastQuestionsSchema>;
export type ListResourcesInput = z.infer<typeof listResourcesQuerySchema>;
