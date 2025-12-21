// app/api/v1/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

//
// GET — Fetch profile
//
export async function GET() {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  // -------------------------------------
  // 2. FETCH PROFILE
  // -------------------------------------
  const profile = await prisma.userProfile.findUnique({
    where: { userId: dbUser.id },
  });

  // If no profile exists yet, return empty fields
  return NextResponse.json({
    userId: dbUser.id,
    profile: profile ?? null,
  });
}

//
// PATCH — Update profile
//
export async function PATCH(req: Request) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  // -------------------------------------
  // 2. PARSE INPUT
  // -------------------------------------
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Allowed fields
  const {
    firstName,
    middleNames,
    lastNames,
    phoneNumber,
    gradeLevel,
    examYear,
    preferredSubjects,
    avatarUrl,
  } = body;

  // -------------------------------------
  // 3. GET OR CREATE PROFILE
  // -------------------------------------
  const existing = await prisma.userProfile.findUnique({
    where: { userId: dbUser.id },
  });

  // -------------------------------------
  // 4. UPDATE OR CREATE
  // -------------------------------------
  const updated = existing
    ? await prisma.userProfile.update({
        where: { userId: dbUser.id },
        data: {
          firstName: firstName ?? existing.firstName,
          middleNames: middleNames ?? existing.middleNames,
          lastNames: lastNames ?? existing.lastNames,
          phoneNumber: phoneNumber ?? existing.phoneNumber,
          gradeLevel: gradeLevel ?? existing.gradeLevel,
          examYear: examYear ?? existing.examYear,
          preferredSubjects:
            preferredSubjects ?? existing.preferredSubjects,
          avatarUrl: avatarUrl ?? existing.avatarUrl,
        },
      })
    : await prisma.userProfile.create({
        data: {
          userId: dbUser.id,
          firstName,
          middleNames,
          lastNames,
          phoneNumber,
          gradeLevel,
          examYear,
          preferredSubjects: preferredSubjects ?? [],
          avatarUrl,
        },
      });

  // -------------------------------------
  // 5. RETURN RESPONSE
  // -------------------------------------
  return NextResponse.json({
    success: true,
    profile: updated,
  });
}
