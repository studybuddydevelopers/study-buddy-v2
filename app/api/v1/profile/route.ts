// app/api/v1/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseProfilePatch } from "@/lib/profile-input";
import { parseJsonObjectRequest } from "@/lib/security/request-body";

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
  const parsedBody = await parseJsonObjectRequest(req);
  if (!parsedBody.ok) return parsedBody.response;
  const parsedProfile = parseProfilePatch(parsedBody.data);
  if (!parsedProfile.ok) {
    return NextResponse.json(
      { error: "INVALID_PROFILE", message: parsedProfile.message },
      { status: 400 }
    );
  }
  const patch = parsedProfile.data;

  if (patch.preferredSubjects?.length) {
    const validSubjects = await prisma.subject.count({
      where: { id: { in: patch.preferredSubjects } },
    });
    if (validSubjects !== patch.preferredSubjects.length) {
      return NextResponse.json(
        {
          error: "INVALID_PROFILE",
          message: "Choose subjects that are currently available in Study Buddy.",
        },
        { status: 400 }
      );
    }
  }

  // -------------------------------------
  // 3. GET OR CREATE PROFILE
  // -------------------------------------
  const existing = await prisma.userProfile.findUnique({
    where: { userId: dbUser.id },
  });

  if (
    !existing &&
    (!patch.firstName || !patch.lastNames || !patch.phoneNumber)
  ) {
    return NextResponse.json(
      { error: "firstName, lastNames and phoneNumber are required" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 4. UPDATE OR CREATE
  // -------------------------------------
  const updated = existing
    ? await prisma.userProfile.update({
        where: { userId: dbUser.id },
        data: patch,
      })
    : await prisma.userProfile.create({
        data: {
          userId: dbUser.id,
          firstName: patch.firstName!,
          middleNames: patch.middleNames,
          lastNames: patch.lastNames!,
          phoneNumber: patch.phoneNumber!,
          gradeLevel: patch.gradeLevel,
          examYear: patch.examYear,
          preferredSubjects: patch.preferredSubjects ?? [],
          avatarUrl: patch.avatarUrl,
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
