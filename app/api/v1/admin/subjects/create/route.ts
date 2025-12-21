// app/api/v1/admin/subjects/create/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  // -------------------------------------
  // 2. PARSE JSON BODY
  // -------------------------------------
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { name, examCode, description } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "name is required and must be a string" },
      { status: 400 }
    );
  }

  // examCode + description are optional strings
  if (examCode && typeof examCode !== "string") {
    return NextResponse.json(
      { error: "examCode must be a string" },
      { status: 400 }
    );
  }

  if (description && typeof description !== "string") {
    return NextResponse.json(
      { error: "description must be a string" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 3. CHECK FOR DUPLICATES
  // -------------------------------------
  const existing = await prisma.subject.findFirst({
    where: { name },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Subject with this name already exists" },
      { status: 409 }
    );
  }

  // -------------------------------------
  // 4. CREATE SUBJECT
  // -------------------------------------
  const subject = await prisma.subject.create({
    data: {
      name,
      examCode: examCode ?? null,
      description: description ?? null,
    },
  });

  // -------------------------------------
  // 5. RESPONSE
  // -------------------------------------
  return NextResponse.json(
    {
      id: subject.id,
      name: subject.name,
      examCode: subject.examCode,
      description: subject.description,
    },
    { status: 201 }
  );
}
