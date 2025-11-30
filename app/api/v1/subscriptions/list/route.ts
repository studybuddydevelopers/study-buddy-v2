import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(req: Request) {
  // ---------------------------------------------------------
  // 1. AUTH
  // ---------------------------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { dbUser } = auth;

  // ---------------------------------------------------------
  // 2. PARSE QUERY PARAMS
  // ---------------------------------------------------------
  const params = new URL(req.url).searchParams;
  const status = params.get("status");
  const plan = params.get("plan");
  const userIdParam = params.get("userId");

  const where: any = {};

  // User role determines what they can query
  if (dbUser.isAdmin) {
    // Admin can filter by any user
    if (userIdParam) where.userId = userIdParam;
  } else {
    // Regular users can ONLY see their own
    where.userId = dbUser.id;
  }

  if (status) {
    where.status = status as any; // relies on SubscriptionStatus enum
  }

  if (plan) {
    where.plan = plan as any; // relies on SubscriptionPlan enum
  }

  // ---------------------------------------------------------
  // 3. FETCH SUBSCRIPTIONS
  // ---------------------------------------------------------
  const subscriptions = await prisma.subscription.findMany({
    where,
    orderBy: {
      startDate: "desc",
    },
  });

  // ---------------------------------------------------------
  // 4. RESPOND
  // ---------------------------------------------------------
  return NextResponse.json({
    subscriptions: subscriptions.map((sub) => ({
      id: sub.id,
      plan: sub.plan,
      status: sub.status,
      userId: sub.userId,
      startDate: sub.startDate,
      endDate: sub.endDate,
      renewalMethod: sub.renewalMethod,
    })),
  });
}
