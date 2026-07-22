import { NextResponse } from "next/server";
import {
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getPagination, getPaginationMeta } from "@/lib/pagination";

function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return Object.values(SubscriptionStatus).includes(
    value as SubscriptionStatus
  );
}

function isSubscriptionPlan(value: string): value is SubscriptionPlan {
  return Object.values(SubscriptionPlan).includes(value as SubscriptionPlan);
}

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
  const { page, pageSize, skip } = getPagination(params, {
    defaultPageSize: 20,
    maxPageSize: 50,
  });

  const where: Prisma.SubscriptionWhereInput = {};

  // User role determines what they can query
  if (dbUser.isAdmin) {
    // Admin can filter by any user
    if (userIdParam) where.userId = userIdParam;
  } else {
    // Regular users can ONLY see their own
    where.userId = dbUser.id;
  }

  if (status) {
    if (!isSubscriptionStatus(status)) {
      return NextResponse.json(
        { error: "Invalid subscription status" },
        { status: 400 }
      );
    }
    where.status = status;
  }

  if (plan) {
    if (!isSubscriptionPlan(plan)) {
      return NextResponse.json(
        { error: "Invalid subscription plan" },
        { status: 400 }
      );
    }
    where.plan = plan;
  }

  // ---------------------------------------------------------
  // 3. FETCH SUBSCRIPTIONS
  // ---------------------------------------------------------
  const [subscriptions, total] = await prisma.$transaction([
    prisma.subscription.findMany({
      where,
      orderBy: {
        startDate: "desc",
      },
      skip,
      take: pageSize,
    }),
    prisma.subscription.count({ where }),
  ]);

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
    pagination: getPaginationMeta(total, page, pageSize),
  });
}
