// app/api/v1/payments/webhook/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  parseTextRequest,
  REQUEST_LIMITS,
} from "@/lib/security/request-body";
import {
  logSecurityEvent,
  securityFingerprint,
} from "@/lib/security/audit-log";
import { getClientIp } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  try {
    // -----------------------------------------------------
    // 1. Read raw body (Paystack requires raw payload)
    // -----------------------------------------------------
    const parsedBody = await parseTextRequest(req, REQUEST_LIMITS.webhook);
    if (!parsedBody.ok) return parsedBody.response;
    const rawBody = parsedBody.data;

    // -----------------------------------------------------
    // 2. Validate Paystack signature
    // -----------------------------------------------------
    const signature = req.headers.get("x-paystack-signature");

    const expectedSignature = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest("hex");

    if (!signaturesMatch(signature, expectedSignature)) {
      logSecurityEvent("webhook_signature_failed", "warn", {
        provider: "paystack",
        ipFingerprint: securityFingerprint(getClientIp(req.headers)),
      });
      return NextResponse.json(
        { error: "Invalid Paystack signature" },
        { status: 401 }
      );
    }

    // -----------------------------------------------------
    // 3. Parse JSON AFTER validating signature
    // -----------------------------------------------------
    const event = JSON.parse(rawBody);

    const data = event.data;

    if (!data || !data.reference) {
      // Paystack sometimes sends pings with no data
      return NextResponse.json({ received: true });
    }

    const reference = data.reference;
    const amount = data.amount / 100;
    const currency = data.currency || "NGN";
    const status = data.status; // "success"
    const userId = data.metadata?.userId; // send from frontend

    if (!userId) {
      logSecurityEvent("payment_webhook_missing_user", "warn", {
        provider: "paystack",
      });
      return NextResponse.json({ received: true });
    }

    // -----------------------------------------------------
    // 4. Prevent duplicates
    // -----------------------------------------------------
    const existing = await prisma.transaction.findFirst({
      where: { reference },
    });

    if (existing) {
      return NextResponse.json({ received: true }); // Already processed
    }

    // -----------------------------------------------------
    // 5. Log transaction in DB
    // -----------------------------------------------------
    await prisma.transaction.create({
      data: {
        userId,
        amount,
        reference,
        currency,
        status,
      },
    });

    // -----------------------------------------------------
    // 6. Respond OK (required by Paystack)
    // -----------------------------------------------------
    return NextResponse.json({ success: true });
  } catch {
    logSecurityEvent("payment_webhook_processing_failed", "error", {
      provider: "paystack",
    });
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

function signaturesMatch(received: string | null, expected: string) {
  if (!received || !/^[a-f0-9]{128}$/i.test(received)) return false;

  const receivedBytes = Buffer.from(received, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  return (
    receivedBytes.byteLength === expectedBytes.byteLength &&
    crypto.timingSafeEqual(receivedBytes, expectedBytes)
  );
}
