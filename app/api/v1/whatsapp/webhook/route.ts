// app/api/v1/whatsapp/webhook/route.ts
import { NextResponse } from "next/server";
import {
  verifyWhatsAppSignature,
  parseIncomingMessages,
  sendWhatsAppText,
} from "@/lib/whatsapp";
import { handleIncomingMessage } from "@/lib/whatsapp-flow";
import {
  parseTextRequest,
  REQUEST_LIMITS,
} from "@/lib/security/request-body";
import {
  logSecurityEvent,
  securityFingerprint,
} from "@/lib/security/audit-log";
import { getClientIp } from "@/lib/security/rate-limit";

// -----------------------------------------------------
// GET — Meta's one-time webhook verification handshake.
// -----------------------------------------------------
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// -----------------------------------------------------
// POST — Inbound message delivery from Meta.
// -----------------------------------------------------
export async function POST(req: Request) {
  try {
    // 1. Read raw body for signature verification.
    const parsedBody = await parseTextRequest(req, REQUEST_LIMITS.webhook);
    if (!parsedBody.ok) return parsedBody.response;
    const rawBody = parsedBody.data;

    // 2. Verify the request came from Meta.
    const signature = req.headers.get("x-hub-signature-256");
    if (!verifyWhatsAppSignature(rawBody, signature)) {
      logSecurityEvent("webhook_signature_failed", "warn", {
        provider: "whatsapp",
        ipFingerprint: securityFingerprint(getClientIp(req.headers)),
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 3. Parse JSON only after signature checks out.
    const payload = JSON.parse(rawBody);

    // 4. Extract inbound messages.
    const messages = parseIncomingMessages(payload);

    // 5. Return 200 IMMEDIATELY so Meta doesn't time out or disable the webhook.
    //    Processing happens in the background after the response is sent.
    const response = NextResponse.json({ received: true });

    // 6. Fire and forget — process messages after returning 200.
    (async () => {
      for (const message of messages) {
        if (message.text) {
          try {
            const reply = await handleIncomingMessage(message.from, message.text);
            await sendWhatsAppText(message.from, reply);
          } catch {
            logSecurityEvent("whatsapp_message_processing_failed", "error", {
              messageFingerprint: securityFingerprint(message.id),
            });
          }
        }
      }
    })();

    return response;
  } catch {
    logSecurityEvent("whatsapp_webhook_processing_failed", "error");
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
