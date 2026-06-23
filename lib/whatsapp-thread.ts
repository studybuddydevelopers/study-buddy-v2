// lib/whatsapp-thread.ts
// Maintains one persistent AiQuestion thread per WhatsApp user.
import { prisma } from "@/lib/prisma";

// AiQuestion has no "source" column, so WhatsApp threads are tagged via
// this fixed questionText marker to distinguish them from web threads
// when looking one up for a given user.
const WHATSAPP_THREAD_MARKER = "[WhatsApp Conversation]";

export async function getOrCreateWhatsAppThread(
  userId: string
): Promise<string> {
  const existing = await prisma.aiQuestion.findFirst({
    where: { userId, questionText: WHATSAPP_THREAD_MARKER },
    orderBy: { createdAt: "desc" },
  });

  if (existing) return existing.id;

  const created = await prisma.aiQuestion.create({
    data: { userId, questionText: WHATSAPP_THREAD_MARKER },
  });

  return created.id;
}
