// lib/whatsapp-user.ts
// Maps WhatsApp wa_id numbers to Study Buddy User accounts.
import { prisma } from "@/lib/prisma";

// Resolves a WhatsApp number to a User, creating a WhatsApp-only account
// (no email/password) on first contact. Returns the User's id.
export async function getOrCreateWhatsAppUser(
  phoneNumber: string
): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { whatsappPhone: phoneNumber },
  });

  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: { whatsappPhone: phoneNumber },
  });

  return created.id;
}
