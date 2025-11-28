// app/api/admin/curriculum/upload/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // ---------- 1) Auth via Supabase cookies ----------
    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          // For this route we only *read* cookies, but helpers require set/remove:
          set() {
            /* no-op for this route */
          },
          remove() {
            /* no-op for this route */
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---------- 2) Check admin privileges ----------
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User record not found" },
        { status: 403 }
      );
    }

    const adminRecord = await prisma.adminUser.findUnique({
      where: { userId: dbUser.id },
    });

    const isAdmin = dbUser.isAdmin || !!adminRecord;

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ---------- 3) Parse & validate body ----------
    const body = await req.json();

    const { subjectId, fileUrl } = body as {
      subjectId?: string;
      fileUrl?: string;
    };

    if (!subjectId || !fileUrl) {
      return NextResponse.json(
        { error: "subjectId and fileUrl are required" },
        { status: 400 }
      );
    }

    const subjectExists = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });

    if (!subjectExists) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }

    // ---------- 4) Create CurriculumFile ----------
    const curriculumFile = await prisma.curriculumFile.create({
      data: {
        subjectId,
        fileUrl,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json({ curriculumFile }, { status: 201 });
  } catch (err) {
    console.error("upload-curriculum error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
