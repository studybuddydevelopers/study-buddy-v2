// app/api/v1/ai/recommendations/cron/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

// Simple cron endpoint: call with a secret header every 24h from a scheduler
export async function POST(req: Request) {
  const secret = process.env.RECOMMENDATIONS_CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const users = await prisma.user.findMany({ select: { id: true } });
  const now = Date.now();

  const created: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ userId: string; error: string }> = [];

  for (const user of users) {
    try {
      // Skip if a recommendation exists in last 23h
      const recent = await prisma.recommendation.findFirst({
        where: { userId: user.id, createdAt: { gte: new Date(now - 23 * 60 * 60 * 1000) } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (recent) {
        skipped.push(user.id);
        continue;
      }

      // Collect progress context
      const tracks = await prisma.progressTrack.findMany({
        where: { userId: user.id },
        include: { subject: { select: { name: true } } },
      });

      const progressSummary =
        tracks.length > 0
          ? tracks
              .map((t) => `${t.subject.name}: ${t.progressPercentage}%`)
              .join("; ")
          : "No progress data yet.";

      const prompt = `
You are StudyBuddy AI. Generate one concise study recommendation (1-3 sentences).
Make it specific, actionable, and tied to the subject(s).
User progress: ${progressSummary}
If no progress data, suggest a smart starting point.
Output only the recommendation text.`;

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.4,
      });

      const recommendationText =
        completion.choices?.[0]?.message?.content ||
        "Focus on a high-impact topic and practice 10 questions daily.";

      await prisma.recommendation.create({
        data: {
          userId: user.id,
          recommendationText,
        },
      });

      created.push(user.id);
    } catch (err: any) {
      errors.push({ userId: user.id, error: err?.message || "unknown error" });
    }
  }

  return NextResponse.json({
    createdCount: created.length,
    skippedCount: skipped.length,
    errorCount: errors.length,
    created,
    skipped,
    errors,
  });
}
