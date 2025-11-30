// app/api/v1/ai/questions/create/route.ts

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
  // 2. PARSE BODY
  // -------------------------------------
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { questionText, subjectId, topicId } = body;

  if (!questionText || typeof questionText !== "string") {
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
  });

  let aiText = "";

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are StudyBuddy AI. Provide clear, structured educational explanations for secondary-school students.",
        },
        {
          role: "user",
          content: questionText,
        },
      ],
      max_tokens: 500,
      temperature: 0.5,
    });

    aiText =
      completion.choices?.[0]?.message?.content ||
      "I'm sorry — I couldn't generate a response.";
  } catch (err: any) {
    return NextResponse.json(
      { error: "AI response generation failed", details: err.message },
      { status: 500 }
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
