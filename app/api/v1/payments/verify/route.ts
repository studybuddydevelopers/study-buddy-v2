// app/api/v1/payments/verify/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonObjectRequest } from "@/lib/security/request-body";
import { fetchWithTimeout } from "@/lib/security/timeouts";

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
  const verifyRes = await fetchWithTimeout(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  const verifyData = await verifyRes.json();

  if (!verifyRes.ok || !verifyData.status || !verifyData.data) {
    return NextResponse.json(
      { error: "Failed verifying Paystack payment" },
      { status: 400 }
    );
  }

  const tx = verifyData.data;

  if (
    tx.status !== "success" ||
    tx.reference !== reference ||
    tx.metadata?.userId !== dbUser.id
  ) {
    return NextResponse.json(
      { error: "Payment does not belong to this account" },
      { status: 403 }
    );
  }

  // -------------------------------------------------------
  // 4. PREVENT DUPLICATE RECORDS
  // -------------------------------------------------------
  const existing = await prisma.transaction.findFirst({
    where: { reference },
  });


  if (existing) {
    return NextResponse.json({
      verified: true,
      provider: "paystack",
      transaction: existing,
      duplicate: true,
    });
  }

  // -------------------------------------------------------
  // 5. SAVE TRANSACTION
  // -------------------------------------------------------
  const record = await prisma.transaction.create({
    data: {
      userId: dbUser.id,
      amount: tx.amount / 100,
      currency: tx.currency,
      status: tx.status,     // "success"
      reference: tx.reference,
    },
  });

  // -------------------------------------------------------
  // 6. RESPOND
  // -------------------------------------------------------
  return NextResponse.json({
    provider: "paystack",
    verified: true,
    transaction: record,
  });
}
