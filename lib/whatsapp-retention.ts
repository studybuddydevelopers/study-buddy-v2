export const WHATSAPP_DELETE_REQUEST_COMMAND = "DELETE MY CHAT";
export const WHATSAPP_DELETE_CONFIRM_COMMAND = "DELETE MY CHAT CONFIRM";
export const WHATSAPP_DELETE_CONFIRMATION_MINUTES = 15;

const WHATSAPP_CONTEXT_MESSAGE_LIMIT = 12;
const WHATSAPP_CONTEXT_CHARACTER_LIMIT = 12_000;

export type WhatsAppConversationCommand = "delete-request" | "delete-confirm";

export function getWhatsAppDeletionConfirmationCutoff(now = new Date()) {
  return new Date(
    now.getTime() - WHATSAPP_DELETE_CONFIRMATION_MINUTES * 60 * 1000
  );
}

export function getWhatsAppConversationCommand(
  text: string
): WhatsAppConversationCommand | null {
  const normalized = text.trim().replace(/\s+/g, " ").toUpperCase();
  if (normalized === WHATSAPP_DELETE_CONFIRM_COMMAND) return "delete-confirm";
  if (normalized === WHATSAPP_DELETE_REQUEST_COMMAND) return "delete-request";
  return null;
}

export function selectRecentWhatsAppContext<T extends { message: string }>(
  newestFirst: T[]
) {
  const selected: T[] = [];
  let characterCount = 0;

  for (const message of newestFirst) {
    if (getWhatsAppConversationCommand(message.message)) continue;
    if (selected.length >= WHATSAPP_CONTEXT_MESSAGE_LIMIT) break;
    const nextCharacterCount = characterCount + message.message.length;
    if (selected.length > 0 && nextCharacterCount > WHATSAPP_CONTEXT_CHARACTER_LIMIT) {
      break;
    }
    selected.push(message);
    characterCount = nextCharacterCount;
  }

  return selected.reverse();
}
