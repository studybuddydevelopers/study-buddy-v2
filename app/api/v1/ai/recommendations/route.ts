// app/api/v1/ai/recommendations/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAiUser } from "@/lib/auth";
import { getString, isRecord } from "@/lib/type-utils";
import OpenAI from "openai";
import { Recommendation } from "@prisma/client";
import {
  parseJsonRequest,
  REQUEST_LIMITS,
} from "@/lib/security/request-body";
import { enforceAiRequestLimits } from "@/lib/security/rate-limit";
import { openAiClientOptions } from "@/lib/security/timeouts";
import {
  globalAiBudgetErrorResponse,
  withGlobalAiTokenBudget,
} from "@/lib/security/ai-budget";
import { logSecurityEvent } from "@/lib/security/audit-log";

export const maxDuration = 30;

const FRESH_WINDOW_MS = 23 * 60 * 60 * 1000;
const DAILY_CAP = 2; // max recommendations per user per ~24h

async function generateRecommendationText(prompt: string) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    ...openAiClientOptions(),
  });

  const messages = [{ role: "user" as const, content: prompt }];
  const completion = await withGlobalAiTokenBudget({
    promptMaterial: messages,
    maxOutputTokens: 300,
    operation: () => client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 300,
      temperature: 0.4,
    }),
    readActualTokens: (result) => result.usage?.total_tokens,
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

export async function GET(req: Request) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireAiUser();
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

  let generated: string[] = [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const aiLimitResponse = await enforceAiRequestLimits({
      accountId: dbUser.id,
      requestHeaders: req.headers,
      units: DAILY_CAP - recent.length,
    });
    if (aiLimitResponse) return aiLimitResponse;

    try {
      generated = await Promise.all(
        Array.from({ length: DAILY_CAP - recent.length }).map((_, idx) => {
          const focus =
            ranked[idx] ||
            ranked[(idx + 1) % (ranked.length || 1)] ||
            "any weak subject";
          const prompt = `
You are StudyBuddy AI. Generate one concise study recommendation (1-3 sentences).
Make it specific, actionable, and tied to the subject(s). Avoid repeating the same advice across multiple recommendations.
User progress: ${progressSummary}
Focus this recommendation on: ${focus}
If no progress data, suggest a smart starting point.
Include a concrete action and target (e.g., number of questions, time block). Output only the recommendation text.`;

          return generateRecommendationText(prompt);
        })
      );
    } catch (err: unknown) {
      const budgetResponse = globalAiBudgetErrorResponse(err);
      if (budgetResponse) return budgetResponse;
      logSecurityEvent("ai_recommendation_generation_failed", "error");
      generated = [
        "Review your lowest-progress subject today and complete one focused practice set.",
      ];
    }
  } else {
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
  const auth = await requireAiUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const { dbUser } = auth;

  // -------------------------------------
  // 2. PARSE INPUT
  // -------------------------------------
  const parsedBody = await parseJsonRequest(req, REQUEST_LIMITS.aiJson);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subjectId = getString(body.subjectId);
  const topicId = getString(body.topicId);
  const context = getString(body.context);

  if (body.context !== undefined && context === undefined) {
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

  const aiLimitResponse = await enforceAiRequestLimits({
    accountId: dbUser.id,
    requestHeaders: req.headers,
  });
  if (aiLimitResponse) return aiLimitResponse;

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
    ...openAiClientOptions(),
  });

  let recommendationText = "";

  try {
    const messages = [{ role: "user" as const, content: prompt }];
    const completion = await withGlobalAiTokenBudget({
      promptMaterial: messages,
      maxOutputTokens: 300,
      operation: () => client.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 300,
        temperature: 0.4,
      }),
      readActualTokens: (result) => result.usage?.total_tokens,
    });

    recommendationText =
      completion.choices?.[0]?.message?.content ||
      "I'm sorry — I couldn't generate a recommendation.";
  } catch (err: unknown) {
    const budgetResponse = globalAiBudgetErrorResponse(err);
    if (budgetResponse) return budgetResponse;
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 502 }
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
