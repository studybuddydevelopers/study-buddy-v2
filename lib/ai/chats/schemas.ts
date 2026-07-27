import { z } from "zod";

const nullableUuid = z.string().uuid().nullable();
const optionalNullableUuid = nullableUuid.optional();

export const createChatSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    subjectId: optionalNullableUuid,
    topicId: optionalNullableUuid,
  })
  .strict();

export const updateChatSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    subjectId: optionalNullableUuid,
    topicId: optionalNullableUuid,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const sendChatMessageSchema = z
  .object({
    message: z.string().trim().min(1).max(4000),
    clientRequestId: z.string().trim().min(8).max(160),
  })
  .strict();

export type CreateChatInput = z.infer<typeof createChatSchema>;
export type UpdateChatInput = z.infer<typeof updateChatSchema>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
