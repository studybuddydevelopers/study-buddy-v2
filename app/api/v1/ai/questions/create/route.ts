// app/api/v1/ai/questions/create/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAiUser } from "@/lib/auth";
import { getString, isRecord } from "@/lib/type-utils";
import OpenAI from "openai";
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

export const maxDuration = 30;

export async function POST(req: Request) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireAiUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  // -------------------------------------
  // 2. PARSE BODY
  // -------------------------------------
  const parsedBody = await parseJsonRequest(req, REQUEST_LIMITS.aiJson);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  if (!isRecord(body)) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const questionText = getString(body.questionText);
  const subjectId = getString(body.subjectId);
  const topicId = getString(body.topicId);

  if (!questionText) {
    return NextResponse.json(
      { error: "questionText is required (string)" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 3. OPTIONAL: VALIDATE SUBJECT/TOPIC
  // -------------------------------------
  if (subjectId) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found" },
        { status: 404 }
      );
    }
  }

  if (topicId) {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found" },
        { status: 404 }
      );
    }
  }

  const aiLimitResponse = await enforceAiRequestLimits({
    accountId: dbUser.id,
    requestHeaders: req.headers,
  });
  if (aiLimitResponse) return aiLimitResponse;

  // -------------------------------------
  // 4. CREATE THREAD (AiQuestion)
  // -------------------------------------
  const question = await prisma.aiQuestion.create({
    data: {
      userId: dbUser.id,
      subjectId: subjectId || null,
      topicId: topicId || null,
      questionText,
    },
  });

  // -------------------------------------
  // 5. SAVE USER MESSAGE
  // -------------------------------------
  const userMessage = await prisma.aiQuestionMessage.create({
    data: {
      aiQuestionId: question.id,
      sender: "user",
      message: questionText,
    },
  });

  // -------------------------------------
  // 6. GENERATE AI RESPONSE
  // -------------------------------------
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    ...openAiClientOptions(),
  });

  let aiText = "";
  const openAIMessages = [
    {
      role: "system" as const,
      content:
        "You are StudyBuddy AI. Provide clear, structured educational explanations for secondary-school students.",
    },
    { role: "user" as const, content: questionText },
  ];

  try {
    const completion = await withGlobalAiTokenBudget({
      promptMaterial: openAIMessages,
      maxOutputTokens: 500,
      operation: () => client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: openAIMessages,
        max_tokens: 500,
        temperature: 0.5,
      }),
      readActualTokens: (result) => result.usage?.total_tokens,
    });

    aiText =
      completion.choices?.[0]?.message?.content ||
      "I'm sorry — I couldn't generate a response.";
  } catch (err: unknown) {
    const budgetResponse = globalAiBudgetErrorResponse(err);
    if (budgetResponse) return budgetResponse;
    return NextResponse.json(
      { error: "AI response generation failed" },
      { status: 502 }
    );
  }

  // -------------------------------------
  // 7. SAVE AI MESSAGE
  // -------------------------------------
  const aiMessage = await prisma.aiQuestionMessage.create({
    data: {
      aiQuestionId: question.id,
      sender: "ai",
      message: aiText,
    },
  });

  // -------------------------------------
  // 8. RESPONSE
  // -------------------------------------
  return NextResponse.json({
    question,
    messages: [userMessage, aiMessage],
  });
}
