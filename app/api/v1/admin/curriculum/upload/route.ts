// app/api/v1/admin/curriculum/upload/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  // -------------------------------------
  // 2. PARSE FORM
  // -------------------------------------
  const formData = await req.formData();
  const subjectId = formData.get("subjectId")?.toString();
  const file = formData.get("file") as File | null;

  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }

  // -------------------------------------
  // 3. CHECK SUBJECT
  // -------------------------------------
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  // -------------------------------------
  // 4. CREATE EDITABLE RESPONSE
  // -------------------------------------
  let res = new NextResponse(); // IMPORTANT: empty, editable response object!

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.headers
            .get("cookie")
            ?.split("; ")
            .find((c) => c.startsWith(name + "="))
            ?.split("=")?.[1];
        },
        set(name: string, value: string, options: any) {
          res.cookies.set(name, value, { ...options, path: "/" });
        },
        remove(name: string, options: any) {
          res.cookies.set(name, "", { ...options, maxAge: 0, path: "/" });
        },
      },
    }
  );

  // -------------------------------------
  // 5. UPLOAD TO STORAGE
  // -------------------------------------
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const filePath = `curriculum/${subjectId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("curriculum")
    .upload(filePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    res = NextResponse.json(
      { error: "Upload failed: " + uploadError.message },
      { status: 500 }
    );
    return res;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("curriculum").getPublicUrl(filePath);

  // -------------------------------------
  // 6. SAVE DB RECORD
  // -------------------------------------
  const record = await prisma.curriculumFile.create({
    data: {
      subjectId,
      uploadedBy: dbUser.id,
      fileUrl: publicUrl,
    },
  });

  // -------------------------------------
  // 7. RESPOND USING *THE SAME RES*
  // -------------------------------------
  res = NextResponse.json({
    id: record.id,
    subjectId: record.subjectId,
    fileUrl: record.fileUrl,
    uploadedAt: record.uploadedAt,
  });

  return res; // MUST return same response object
}
