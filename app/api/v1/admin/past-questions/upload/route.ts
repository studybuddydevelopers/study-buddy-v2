// app/api/v1/admin/past-questions/upload/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  // ----------------------------------------
  // 1. AUTH (Admin only)
  // ----------------------------------------
  const auth = await requireAdmin();
  if ("errorResponse" in auth) return auth.errorResponse;

  // ----------------------------------------
  // 2. Parse FormData
  // ----------------------------------------
  const formData = await req.formData();

  const subjectId = formData.get("subjectId")?.toString();
  const topicId = formData.get("topicId")?.toString() ?? null;
  const questionText = formData.get("questionText")?.toString();
  const answerText = formData.get("answerText")?.toString();
  const explanationText = formData.get("explanationText")?.toString() ?? null;
  const yearRaw = formData.get("year")?.toString();
  const questionNumber = formData.get("questionNumber")?.toString() ?? null;
  const difficultyRaw = formData.get("difficulty")?.toString();
  const image = formData.get("image") as File | null;

  if (!subjectId || !questionText || !answerText) {
    return NextResponse.json(
      { error: "subjectId, questionText and answerText are required" },
      { status: 400 }
    );
  }

  const year = yearRaw ? Number(yearRaw) : null;
  const difficulty = difficultyRaw ? Number(difficultyRaw) : null;

  if (yearRaw && isNaN(year!)) {
    return NextResponse.json({ error: "year must be a number" }, { status: 400 });
  }

  if (difficultyRaw && isNaN(difficulty!)) {
    return NextResponse.json(
      { error: "difficulty must be a number" },
      { status: 400 }
    );
  }

  // ----------------------------------------
  // 3. Validate Subject
  // ----------------------------------------
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  }

  // ----------------------------------------
  // 4. Prepare Editable Response (Supabase SSR requirement)
  // ----------------------------------------
  let res = new NextResponse();

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

  // ----------------------------------------
  // 5. Handle Image Upload (if provided)
  // ----------------------------------------
  let imageUrl: string | null = null;

  if (image) {
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(image.type)) {
      res = NextResponse.json(
        { error: "Image must be PNG or JPEG" },
        { status: 400 }
      );
      return res;
    }

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filePath = `past-questions/${subjectId}/${Date.now()}-${image.name}`;

    const { error: uploadError } = await supabase.storage
      .from("past-questions")
      .upload(filePath, buffer, {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      res = NextResponse.json(
        { error: "Image upload failed: " + uploadError.message },
        { status: 500 }
      );
      return res;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("past-questions").getPublicUrl(filePath);

    imageUrl = publicUrl;
  }

  // ----------------------------------------
  // 6. Create Database Record
  // ----------------------------------------
  const record = await prisma.pastQuestion.create({
    data: {
      subjectId,
      topicId,
      questionText,
      questionImageUrl: imageUrl,
      answerText,
      explanationText,
      year,
      questionNumber,
      difficulty,
    },
  });

  // ----------------------------------------
  // 7. Return Sanitized Response (same response object)
  // ----------------------------------------
  res = NextResponse.json({
    id: record.id,
    subjectId: record.subjectId,
    topicId: record.topicId,
    questionText: record.questionText,
    questionImageUrl: record.questionImageUrl,
    answerText: record.answerText,
    explanationText: record.explanationText,
    year: record.year,
    questionNumber: record.questionNumber,
    difficulty: record.difficulty,
    createdAt: record.id, // (Prisma model doesn’t define createdAt, so omitted)
  });

  return res;
}
