// lib/whatsapp-user.ts
// Maps WhatsApp wa_id numbers to Study Buddy User accounts.
import { prisma } from "@/lib/prisma";

// Resolves a WhatsApp number to a User, creating a WhatsApp-only account
// (no email/password) on first contact. Returns the account status as well so
// restricted accounts cannot bypass the web authorization checks.
export async function getOrCreateWhatsAppUser(
  phoneNumber: string
): Promise<{ id: string; accountStatus: string }> {
  const existing = await prisma.user.findUnique({
    where: { whatsappPhone: phoneNumber },
    select: { id: true, accountStatus: true },
  });

  if (existing) return existing;

  const created = await prisma.user.create({
    data: { whatsappPhone: phoneNumber },
    select: { id: true, accountStatus: true },
  });

  return created;
}
