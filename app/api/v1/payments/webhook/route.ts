// app/api/v1/payments/webhook/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import crypto from "crypto";

// REQUIRED: disable Next.js automatic body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: Request) {
  try {
    // -----------------------------------------------------
    // 1. Read raw body (Paystack requires raw payload)
    // -----------------------------------------------------
    const rawBody = await req.text();

    // -----------------------------------------------------
    // 2. Validate Paystack signature
    // -----------------------------------------------------
    const signature = req.headers.get("x-paystack-signature");

    const expectedSignature = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { error: "Invalid Paystack signature" },
        { status: 401 }
      );
    }

    // -----------------------------------------------------
    // 3. Parse JSON AFTER validating signature
    // -----------------------------------------------------
    const event = JSON.parse(rawBody);

    const eventType = event.event; // e.g. "charge.success"
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
      console.warn("⚠️ Paystack webhook missing metadata.userId");
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
  } catch (error) {
    console.error("PAYSTACK WEBHOOK ERROR:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
