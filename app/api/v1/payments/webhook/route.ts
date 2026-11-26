// app/api/v1/payments/webhook/route.ts
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
import { parseSuccessfulPaystackCharge, paystackSecretKey, recordPaystackCharge } from "@/lib/paystack-payments";
import { isRecord } from "@/lib/type-utils";

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
    const secret = paystackSecretKey();
    if (!secret) return NextResponse.json({ error: "Payments unavailable" }, { status: 503 });

    const expectedSignature = crypto
      .createHmac("sha512", secret)
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
    const event: unknown = JSON.parse(rawBody);
    if (!isRecord(event) || event.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }
    const charge = parseSuccessfulPaystackCharge(event.data);
    if (!charge) {
      logSecurityEvent("payment_webhook_invalid_charge", "warn", {
        provider: "paystack",
      });
      return NextResponse.json({ received: true });
    }
    const created = await recordPaystackCharge(charge);
    return NextResponse.json(created ? { success: true } : { received: true });
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
