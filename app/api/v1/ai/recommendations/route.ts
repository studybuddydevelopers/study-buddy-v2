// app/api/v1/ai/recommendations/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import OpenAI from "openai";
import { Recommendation } from "@prisma/client";

const FRESH_WINDOW_MS = 23 * 60 * 60 * 1000;
const DAILY_CAP = 2; // max recommendations per user per ~24h

async function generateRecommendationText(prompt: string) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: 0.4,
  });

  return (
    completion.choices?.[0]?.message?.content ||
    "Focus on a high-impact topic and practice 10 questions daily."
  );
}

async function buildProgressContext(userId: string) {
  const tracks = await prisma.progressTrack.findMany({
    where: { userId },
    include: { subject: { select: { name: true } } },
  });

  const summary = tracks.length
    ? tracks.map((t) => `${t.subject.name}: ${t.progressPercentage}%`).join("; ")
    : "No progress data yet.";

  const ranked = tracks
    .slice()
    .sort((a, b) => a.progressPercentage - b.progressPercentage)
    .map((t) => t.subject.name);

  return { summary, ranked };
}

export async function GET() {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  // -------------------------------------
  // 2. CHECK RECENT RECOMMENDATION
  // -------------------------------------
  const now = Date.now();
  const since = new Date(now - FRESH_WINDOW_MS);

  const recent = await prisma.recommendation.findMany({
    where: { userId: dbUser.id, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: DAILY_CAP,
  });

  if (recent.length >= DAILY_CAP) {
    return NextResponse.json({
      recommendations: recent.map((r) => ({
        title: "AI Recommendation",
        body: r.recommendationText,
      })),
    });
  }

  // -------------------------------------
  // 3. GENERATE NEW RECOMMENDATION (fill up to cap)
  // -------------------------------------
  const progressContext = await buildProgressContext(dbUser.id);
  const { summary: progressSummary, ranked } = progressContext;
  console.log("progressContext: ", progressContext);
  console.log("progressSummary: ", progressSummary);

  let generated: string[] = [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      generated = await Promise.all(
        Array.from({ length: DAILY_CAP - recent.length }).map((_, idx) => {
          const focus =
            ranked[idx] ||
            ranked[(idx + 1) % (ranked.length || 1)] ||
            "any weak subject";
          console.log("focus: ", focus);
          const prompt = `
You are StudyBuddy AI. Generate one concise study recommendation (1-3 sentences).
Make it specific, actionable, and tied to the subject(s). Avoid repeating the same advice across multiple recommendations.
User progress: ${progressSummary}
Focus this recommendation on: ${focus}
If no progress data, suggest a smart starting point.
Include a concrete action and target (e.g., number of questions, time block). Output only the recommendation text.`;
          console.log("prompt: ", prompt);

          return generateRecommendationText(prompt);
        })
      );
    } catch (err: any) {
      console.log("There is an error that occured, err: ", err);
      generated = [
        "Review your lowest-progress subject today and complete one focused practice set.",
      ];
    }
  } else {
    console.log("There is no opeani key")
    generated = [
      "Start with your weakest subject and aim for one focused practice block today.",
    ];
  }

  const toCreate = generated.map((text) => ({
    userId: dbUser.id,
    recommendationText: text,
  }));

  let created: Recommendation[] = [];
  if (toCreate.length) {
    await prisma.recommendation.createMany({ data: toCreate });
    created = await prisma.recommendation.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      take: DAILY_CAP,
    });
  }

  const all = [...recent, ...created].slice(0, DAILY_CAP);

  return NextResponse.json({
    recommendations: all.map((r) => ({
      title: "AI Recommendation",
      body: r.recommendationText,
    })),
  });
}

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
