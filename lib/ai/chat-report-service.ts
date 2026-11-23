import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ChatServiceError } from "./chats/errors";
import type { ChatReportInput } from "./chat-report";

export const reportReceiptSelect = {
  id: true, status: true, createdAt: true, reviewedAt: true, resolutionNote: true,
} satisfies Prisma.AiChatMessageReportSelect;

async function requireOwnedResponse(userId: string, chatId: string, messageId: string) {
  const message = await prisma.aiChatMessage.findFirst({
    where: { id: messageId, chatId, role: "ASSISTANT", status: "COMPLETED", chat: { userId, deletedAt: null } },
    select: { id: true },
  });
  if (!message) throw new ChatServiceError("CHAT_NOT_FOUND", 404, "This response is not available.");
}

export async function getChatReport(userId: string, chatId: string, messageId: string) {
  await requireOwnedResponse(userId, chatId, messageId);
  return prisma.aiChatMessageReport.findFirst({ where: { messageId, userId }, select: reportReceiptSelect });
}

export async function submitChatReport(userId: string, chatId: string, messageId: string, input: ChatReportInput) {
  await requireOwnedResponse(userId, chatId, messageId);
  // A retry/double click returns the original case without overwriting its reason.
  return prisma.aiChatMessageReport.upsert({
    where: { messageId },
    create: { userId, messageId, ...input },
    update: {},
    select: reportReceiptSelect,
  });
}
