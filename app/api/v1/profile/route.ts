// app/api/v1/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
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
  const body = parsedBody.data;

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

  const stringFields = {
    firstName,
    middleNames,
    lastNames,
    phoneNumber,
    gradeLevel,
    avatarUrl,
  };
  if (
    Object.values(stringFields).some(
      (value) => value !== undefined && value !== null && typeof value !== "string"
    ) ||
    (examYear !== undefined &&
      examYear !== null &&
      (!Number.isInteger(examYear) || typeof examYear !== "number")) ||
    (preferredSubjects !== undefined &&
      (!Array.isArray(preferredSubjects) ||
        preferredSubjects.some((value) => typeof value !== "string")))
  ) {
    return NextResponse.json({ error: "Invalid profile fields" }, { status: 400 });
  }

  // -------------------------------------
  // 3. GET OR CREATE PROFILE
  // -------------------------------------
  const existing = await prisma.userProfile.findUnique({
    where: { userId: dbUser.id },
  });

  if (
    !existing &&
    (typeof firstName !== "string" ||
      typeof lastNames !== "string" ||
      typeof phoneNumber !== "string")
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
        data: {
          firstName: (firstName as string | undefined) ?? existing.firstName,
          middleNames: (middleNames as string | null | undefined) ?? existing.middleNames,
          lastNames: (lastNames as string | undefined) ?? existing.lastNames,
          phoneNumber: (phoneNumber as string | undefined) ?? existing.phoneNumber,
          gradeLevel: (gradeLevel as string | null | undefined) ?? existing.gradeLevel,
          examYear: (examYear as number | null | undefined) ?? existing.examYear,
          preferredSubjects:
            (preferredSubjects as string[] | undefined) ?? existing.preferredSubjects,
          avatarUrl: (avatarUrl as string | null | undefined) ?? existing.avatarUrl,
        },
      })
    : await prisma.userProfile.create({
        data: {
          userId: dbUser.id,
          firstName: firstName as string,
          middleNames: middleNames as string | null | undefined,
          lastNames: lastNames as string,
          phoneNumber: phoneNumber as string,
          gradeLevel: gradeLevel as string | null | undefined,
          examYear: examYear as number | null | undefined,
          preferredSubjects: (preferredSubjects as string[] | undefined) ?? [],
          avatarUrl: avatarUrl as string | null | undefined,
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
