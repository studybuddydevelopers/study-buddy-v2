import { z } from "zod";

export const CHAT_REPORT_REASONS = {
  INCORRECT: "Incorrect answer",
  INCOMPLETE: "Incomplete answer",
  UNSAFE: "Unsafe content",
  OTHER: "Something else",
} as const;

export const chatReportSchema = z.object({
  reason: z.enum(["INCORRECT", "INCOMPLETE", "UNSAFE", "OTHER"]),
  details: z.string().trim().max(2000).default(""),
}).strict();

export const chatReportReviewSchema = z.object({
  resolutionNote: z.string().trim().min(1).max(2000),
}).strict();

export type ChatReportInput = z.infer<typeof chatReportSchema>;
export interface ChatReportReceipt {
  id: string;
  status: "OPEN" | "REVIEWED";
  createdAt: string;
  reviewedAt: string | null;
  resolutionNote: string | null;
}
