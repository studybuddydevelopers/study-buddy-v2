// app/api/v1/payments/verify/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const body = await req.json().catch(() => null);
  const reference = body?.reference;

  if (!reference) {
    return NextResponse.json(
      { error: "reference is required" },
      { status: 400 }
    );
  }

  // -------------------------------------------------------
  // 3. VERIFY WITH PAYSTACK
  // -------------------------------------------------------
  const verifyRes = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  const verifyData = await verifyRes.json();

  if (!verifyData.status || !verifyData.data) {
    return NextResponse.json(
      { error: "Failed verifying Paystack payment" },
      { status: 400 }
    );
  }

  const tx = verifyData.data;

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
