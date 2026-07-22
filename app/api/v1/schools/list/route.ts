import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getPagination, getPaginationMeta } from "@/lib/pagination";

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
  const searchParams = new URL(req.url).searchParams;
  const { page, pageSize, skip } = getPagination(searchParams, {
    defaultPageSize: 20,
    maxPageSize: 50,
  });

  const where: Prisma.SchoolWhereInput = {};

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
  const [schools, total] = await prisma.$transaction([
    prisma.school.findMany({
      where,
      orderBy: {
        name: "asc",
      },
      skip,
      take: pageSize,
      select: {
        id: true,
        name: true,
        location: true,
        adminEmail: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
    }),
    prisma.school.count({ where }),
  ]);

  // ---------------------------------------------------------
  // 4. RESPOND
  // ---------------------------------------------------------
  return NextResponse.json({
    schools: schools.map((s) => ({
      id: s.id,
      name: s.name,
      location: s.location,
      adminEmail: s.adminEmail,
      studentCount: s._count.students,
    })),
    pagination: getPaginationMeta(total, page, pageSize),
  });
}
