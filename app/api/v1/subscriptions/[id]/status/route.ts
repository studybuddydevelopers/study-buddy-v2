import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // ---------------------------------------------------------
  // 1. AUTH
  // ---------------------------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { dbUser } = auth;

  const subscriptionId = (await context.params).id;

  if (!subscriptionId) {
    return NextResponse.json(
      { error: "Subscription ID is required" },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------
  // 2. FETCH SUBSCRIPTION
  // ---------------------------------------------------------
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 }
    );
  }

  // ---------------------------------------------------------
  // 3. AUTHORIZATION CHECK
  // ---------------------------------------------------------
  // Admins can access any subscription
  if (!dbUser.isAdmin) {
    // Non-admin users MUST own the subscription
    if (subscription.userId !== dbUser.id) {
      return NextResponse.json(
        { error: "Forbidden — not your subscription" },
        { status: 403 }
      );
    }
  }

  // ---------------------------------------------------------
  // 4. RESPOND
  // ---------------------------------------------------------
  return NextResponse.json({
    id: subscription.id,
    plan: subscription.plan,
    status: subscription.status,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    renewalMethod: subscription.renewalMethod,
    userId: subscription.userId,
  });
}
