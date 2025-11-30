// app/api/v1/admin/users/query/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  // -------------------------------------
  // 2. GET QUERY PARAMS
  // -------------------------------------
  const { searchParams } = new URL(req.url);

  const search = searchParams.get("search") || undefined;
  const isAdminFilter = searchParams.get("isAdmin");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");

  const skip = (page - 1) * pageSize;

  // -------------------------------------
  // 3. BUILD WHERE CLAUSE
  // -------------------------------------
  const where: any = {};

  if (search) {
    where.OR = [
      { profile: { firstName: { contains: search, mode: "insensitive" } } },
      { profile: { lastNames: { contains: search, mode: "insensitive" } } },
      { profile: { phoneNumber: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (isAdminFilter === "true") {
    where.isAdmin = true;
  }
  if (isAdminFilter === "false") {
    where.isAdmin = false;
  }

  // -------------------------------------
  // 4. QUERY DATABASE
  // -------------------------------------
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        profile: true,
        adminUser: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  // -------------------------------------
  // 5. FORMAT CLEAN RESPONSE
  // -------------------------------------
  const formatted = users.map((u) => ({
    id: u.id,
    createdAt: u.createdAt,
    isAdmin: u.isAdmin,
    profile: u.profile
      ? {
          firstName: u.profile.firstName,
          lastNames: u.profile.lastNames,
          phoneNumber: u.profile.phoneNumber,
        }
      : null,
  }));

  // -------------------------------------
  // 6. RETURN
  // -------------------------------------
  return NextResponse.json({
    users: formatted,
    pagination: {
      page,
      pageSize,
      total,
    },
  });
}
