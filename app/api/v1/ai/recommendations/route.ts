// app/api/v1/ai/recommendations/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import OpenAI from "openai";

export async function POST(req: Request) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { dbUser } = auth;

  // -------------------------------------
  // 2. PARSE INPUT
  // -------------------------------------
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subjectId, topicId, context } = body;

  if (context && typeof context !== "string") {
    return NextResponse.json(
      { error: "context must be a string" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 3. OPTIONAL: VALIDATE SUBJECT/TOPIC
  // -------------------------------------
  if (subjectId) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }
  }

  if (topicId) {
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }
  }

  // -------------------------------------
  // 4. GENERATE AI RECOMMENDATION
  // -------------------------------------
  const prompt = `
You are StudyBuddy AI. 
Generate clear, practical study recommendations for a secondary-school student.

Context: ${context || "none provided"}
${subjectId ? `Subject ID: ${subjectId}` : ""}
${topicId ? `Topic ID: ${topicId}` : ""}

Output ONLY the recommendation text.
`;

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  let recommendationText = "";

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.4,
    });

    recommendationText =
      completion.choices?.[0]?.message?.content ||
      "I'm sorry — I couldn't generate a recommendation.";
  } catch (err: any) {
    return NextResponse.json(
      { error: "AI generation failed", details: err.message },
      { status: 500 }
    );
  }

  // -------------------------------------
  // 5. SAVE TO DATABASE
  // -------------------------------------
  const rec = await prisma.recommendation.create({
    data: {
      userId: dbUser.id,
      subjectId: subjectId || null,
      topicId: topicId || null,
      recommendationText,
    },
  });

  // -------------------------------------
  // 6. RETURN
  // -------------------------------------
  return NextResponse.json({
    recommendation: rec,
  });
}
