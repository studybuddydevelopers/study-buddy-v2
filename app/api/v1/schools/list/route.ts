import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  // ---------------------------------------------------------
  // 1. AUTH
  // ---------------------------------------------------------
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  // ---------------------------------------------------------
  // 2. PARSE QUERY PARAMS
  // ---------------------------------------------------------
  const { search, location } = Object.fromEntries(
    new URL(req.url).searchParams.entries()
  );

  const where: any = {};

  if (search) {
    where.name = {
      contains: search,
      mode: "insensitive",
    };
  }

  if (location) {
    where.location = {
      contains: location,
      mode: "insensitive",
    };
  }

  // ---------------------------------------------------------
  // 3. FETCH SCHOOLS
  // ---------------------------------------------------------
  const schools = await prisma.school.findMany({
    where,
    orderBy: {
      name: "asc",
    },
    include: {
      students: true, // returns student records attached to the school
    },
  });

  // ---------------------------------------------------------
  // 4. RESPOND
  // ---------------------------------------------------------
  return NextResponse.json({
    schools: schools.map((s) => ({
      id: s.id,
      name: s.name,
      location: s.location,
      adminEmail: s.adminEmail,
      studentCount: s.students.length,
    })),
  });
}
