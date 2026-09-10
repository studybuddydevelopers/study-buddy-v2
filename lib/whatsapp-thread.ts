// lib/whatsapp-thread.ts
// Maintains one persistent AiQuestion thread per WhatsApp user.
import { prisma } from "@/lib/prisma";

// AiQuestion has no "source" column, so WhatsApp threads are tagged via
// this fixed questionText marker to distinguish them from web threads
// when looking one up for a given user.
export const WHATSAPP_THREAD_MARKER = "[WhatsApp Conversation]";

export async function findWhatsAppThread(userId: string) {
  const existing = await prisma.aiQuestion.findFirst({
    where: { userId, questionText: WHATSAPP_THREAD_MARKER },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return existing?.id ?? null;
}

export async function getOrCreateWhatsAppThread(
  userId: string
): Promise<string> {
  const existingId = await findWhatsAppThread(userId);
  if (existingId) return existingId;

  const created = await prisma.aiQuestion.create({
    data: { userId, questionText: WHATSAPP_THREAD_MARKER },
  });

  return created.id;
}

export async function deleteWhatsAppConversation(userId: string) {
  const deleted = await prisma.aiQuestion.deleteMany({
    where: { userId, questionText: WHATSAPP_THREAD_MARKER },
  });
  return deleted.count;
}
