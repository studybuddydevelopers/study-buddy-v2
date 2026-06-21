// app/api/v1/whatsapp/webhook/route.ts
import { NextResponse } from "next/server";
import {
  verifyWhatsAppSignature,
  parseIncomingMessages,
  sendWhatsAppText,
} from "@/lib/whatsapp";

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
    const rawBody = await req.text();

    // 2. Verify the request came from Meta.
    const signature = req.headers.get("x-hub-signature-256");
    if (!verifyWhatsAppSignature(rawBody, signature)) {
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
        console.log(`WhatsApp message from ${message.from}:`, message.text);

        // TODO: Replace this placeholder with real Study Buddy routing —
        // e.g. pipe message.text into your AI Q&A flow at
        // app/api/v1/ai/messages/route.ts
        if (message.text) {
          await sendWhatsAppText(
            message.from,
            `Got it — you said: "${message.text}". I'm still learning how to help with that!`
          );
        }
      }
    })();

    return response;
  } catch (error) {
    console.error("WHATSAPP WEBHOOK ERROR:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}