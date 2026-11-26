// app/api/v1/payments/verify/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonObjectRequest } from "@/lib/security/request-body";
import { fetchWithTimeout } from "@/lib/security/timeouts";
import { parseSuccessfulPaystackCharge, paystackSecretKey, recordPaystackCharge } from "@/lib/paystack-payments";
import { isRecord } from "@/lib/type-utils";

export async function POST(req: Request) {
  // -------------------------------------------------------
  // 1. AUTH
  // -------------------------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  // -------------------------------------------------------
  // 2. INPUT
  // -------------------------------------------------------
  const parsedBody = await parseJsonObjectRequest(req);
  if (!parsedBody.ok) return parsedBody.response;
  const reference =
    typeof parsedBody.data.reference === "string"
      ? parsedBody.data.reference
      : undefined;

  if (!reference) {
    return NextResponse.json(
      { error: "reference is required" },
      { status: 400 }
    );
  }

  // -------------------------------------------------------
  // 3. VERIFY WITH PAYSTACK
  // -------------------------------------------------------
  const secret = paystackSecretKey();
  if (!secret) return NextResponse.json({ error: "Payments unavailable" }, { status: 503 });

  let verifyData: unknown;
  try {
    const response = await fetchWithTimeout(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    if (!response.ok) {
      const status = response.status >= 500 || response.status === 429 ? 503 : 400;
      return NextResponse.json({ error: "Failed verifying Paystack payment" }, { status });
    }
    verifyData = await response.json();
  } catch {
    return NextResponse.json({ error: "Failed verifying Paystack payment" }, { status: 503 });
  }

  if (!isRecord(verifyData) || verifyData.status !== true || !isRecord(verifyData.data)) {
    return NextResponse.json(
      { error: "Failed verifying Paystack payment" },
      { status: 400 }
    );
  }

  const charge = parseSuccessfulPaystackCharge(verifyData.data);

  if (
    !charge || charge.reference !== reference || charge.userId !== dbUser.id
  ) {
    return NextResponse.json(
      { error: "Payment does not belong to this account" },
      { status: 403 }
    );
  }

  // -------------------------------------------------------
  // 4. PREVENT DUPLICATE RECORDS
  // -------------------------------------------------------
  const created = await recordPaystackCharge(charge);
  const record = await prisma.transaction.findUnique({ where: { reference } });
  if (!record || record.userId !== dbUser.id) {
    return NextResponse.json({ error: "Payment does not belong to this account" }, { status: 403 });
  }
  if (record.amount !== charge.amount || record.currency !== charge.currency || record.status !== charge.status) {
    return NextResponse.json({ error: "Payment record requires reconciliation" }, { status: 409 });
  }
  return NextResponse.json({
    provider: "paystack",
    verified: true,
    transaction: record,
    ...(!created && { duplicate: true }),
  });
}
