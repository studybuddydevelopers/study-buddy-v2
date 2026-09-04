import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseJsonObjectRequest } from "@/lib/security/request-body";

export async function POST(req: Request) {
  // ---------------------------------------------------------
  // 1. AUTH
  // ---------------------------------------------------------
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  // ---------------------------------------------------------
  // 2. PARSE INPUT
  // ---------------------------------------------------------
  const parsedBody = await parseJsonObjectRequest(req);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const { name, location, adminEmail } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  // location and adminEmail are optional but must be strings if provided
  if (location !== undefined && location !== null && typeof location !== "string") {
    return NextResponse.json(
      { error: "location must be a string" },
      { status: 400 }
    );
  }

  if (
    adminEmail !== undefined &&
    adminEmail !== null &&
    typeof adminEmail !== "string"
  ) {
    return NextResponse.json(
      { error: "adminEmail must be a string" },
      { status: 400 }
    );
  }

  // ---------------------------------------------------------
  // 3. CREATE SCHOOL
  // ---------------------------------------------------------
  const school = await prisma.school.create({
    data: {
      name,
      location: (location as string | null | undefined) ?? null,
      adminEmail: (adminEmail as string | null | undefined) ?? null,
    },
    include: {
      students: true, // returns empty array by default
    },
  });

  // ---------------------------------------------------------
  // 4. RESPOND
  // ---------------------------------------------------------
  return NextResponse.json({
    id: school.id,
    name: school.name,
    location: school.location,
    adminEmail: school.adminEmail,
    createdAt: school.students, // optional if you want
    students: school.students,
  });
}
