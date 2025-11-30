// app/api/v1/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { dbUser } = auth;

  // -------------------------------------
  // 2. FETCH USER + PROFILE + SUBSCRIPTION
  // -------------------------------------
  const userData = await prisma.user.findUnique({
    where: { id: dbUser.id },
    include: {
      profile: true,
      subscriptions: {
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
  });

  if (!userData) {
    return NextResponse.json(
      { error: "User record not found" },
      { status: 404 }
    );
  }

  const subscription = userData.subscriptions[0] ?? null;

  // -------------------------------------
  // 3. FORMAT RESPONSE
  // -------------------------------------
  return NextResponse.json({
    id: userData.id,
    createdAt: userData.createdAt,
    isAdmin: userData.isAdmin,

    profile: userData.profile
      ? {
          firstName: userData.profile.firstName,
          middleNames: userData.profile.middleNames,
          lastNames: userData.profile.lastNames,
          phoneNumber: userData.profile.phoneNumber,
          gradeLevel: userData.profile.gradeLevel,
          waecYear: userData.profile.waecYear,
          preferredSubjects: userData.profile.preferredSubjects,
          avatarUrl: userData.profile.avatarUrl,
        }
      : null,

    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          renewalMethod: subscription.renewalMethod,
        }
      : null,
  });
}
