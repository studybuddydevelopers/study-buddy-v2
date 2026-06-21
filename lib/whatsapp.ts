// lib/whatsapp.ts
// Helpers for the WhatsApp Cloud API (Meta) integration.
import crypto from "crypto";

const GRAPH_API_VERSION = "v21.0";

export type IncomingWhatsAppMessage = {
  id: string;
  from: string; // sender's WhatsApp number (wa_id), e.g. "2348012345678"
  timestamp: string;
  type: string; // "text" | "image" | "audio" | "button" | ...
  text: string | null; // best-effort plain-text content, null for unsupported types
  contactName: string | null;
};

// -----------------------------------------------------
// Signature verification
// -----------------------------------------------------
// Meta signs every webhook delivery with the app secret and sends the
// digest in the `x-hub-signature-256` header as `sha256=<hex digest>`.
// This must run against the *raw* request body, before JSON.parse.
export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;

  const [scheme, receivedDigest] = signatureHeader.split("=");
  if (scheme !== "sha256" || !receivedDigest) return false;

  const expectedDigest = crypto
    .createHmac("sha256", process.env.WHATSAPP_APP_SECRET!)
    .update(rawBody)
    .digest("hex");

  const expected = Buffer.from(expectedDigest, "hex");
  const received = Buffer.from(receivedDigest, "hex");

  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}

// -----------------------------------------------------
// Message parsing
// -----------------------------------------------------
// Cloud API webhook payloads can carry status updates (delivered/read) as
// well as actual messages, and a single delivery can batch multiple
// entries/changes. This walks the structure and extracts only inbound
// user messages, in a shape the rest of the app can consume directly.
export function parseIncomingMessages(
  payload: any
): IncomingWhatsAppMessage[] {
  const messages: IncomingWhatsAppMessage[] = [];

  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      if (!value?.messages) continue; // e.g. status callbacks have no `messages`

      const contactsByWaId = new Map<string, string>();
      for (const contact of value.contacts ?? []) {
        if (contact?.wa_id) {
          contactsByWaId.set(contact.wa_id, contact?.profile?.name ?? null);
        }
      }

      for (const message of value.messages) {
        messages.push({
          id: message.id,
          from: message.from,
          timestamp: message.timestamp,
          type: message.type,
          text: extractMessageText(message),
          contactName: contactsByWaId.get(message.from) ?? null,
        });
      }
    }
  }

  return messages;
}

function extractMessageText(message: any): string | null {
  switch (message.type) {
    case "text":
      return message.text?.body ?? null;
    case "button":
      return message.button?.text ?? null;
    case "interactive":
      return (
        message.interactive?.button_reply?.title ??
        message.interactive?.list_reply?.title ??
        null
      );
    default:
      // Media, location, contacts, etc. — handled by future parsers.
      return null;
  }
}

// -----------------------------------------------------
// Sending messages
// -----------------------------------------------------
// Sends a plain-text reply to a WhatsApp user via the Cloud API.
// `to` must be the recipient's wa_id (digits only, e.g. "2348012345678").
export async function sendWhatsAppText(to: string, body: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `WhatsApp send failed (${response.status}): ${errorBody}`
    );
  }

  return response.json();
}
