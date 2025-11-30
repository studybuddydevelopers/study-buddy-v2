// app/api/v1/ai/questions/[id]/reply/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import OpenAI from "openai";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  // -------------------------------------
  // 1. AUTH
  // -------------------------------------
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  const aiQuestionId = params.id;

  // -------------------------------------
  // 2. VALIDATE INPUT
  // -------------------------------------
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message } = body;
  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "message is required (string)" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 3. VALIDATE THREAD OWNERSHIP
  // -------------------------------------
  const thread = await prisma.aiQuestion.findUnique({
    where: { id: aiQuestionId },
  });

  if (!thread) {
    return NextResponse.json(
      { error: "AI question thread not found" },
      { status: 404 }
    );
  }

  if (thread.userId !== dbUser.id) {
    return NextResponse.json(
      { error: "Forbidden: you do not own this thread" },
      { status: 403 }
    );
  }

  // -------------------------------------
  // 4. SAVE USER MESSAGE
  // -------------------------------------
  const userMessage = await prisma.aiQuestionMessage.create({
    data: {
      aiQuestionId,
      sender: "user",
      message,
    },
  });

  // -------------------------------------
  // 5. PREPARE CHAT CONTEXT FOR GPT
  // -------------------------------------
  const previousMessages = await prisma.aiQuestionMessage.findMany({
    where: { aiQuestionId },
    orderBy: { createdAt: "asc" },
  });

  const openAIMessages = [
    {
      role: "system",
      content:
        "You are StudyBuddy AI. Provide clear and helpful educational explanations to secondary-school students.",
    },
    ...previousMessages.map((m) => ({
      role: m.sender === "ai" ? "assistant" : "user",
      content: m.message,
    })),
  ];

  // -------------------------------------
  // 6. CALL OPENAI
  // -------------------------------------
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  let aiText = "";

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openAIMessages,
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
      aiQuestionId,
      sender: "ai",
      message: aiText,
    },
  });

  // -------------------------------------
  // 8. RESPOND
  // -------------------------------------
  return NextResponse.json({
    userMessage,
    aiMessage,
  });
}
