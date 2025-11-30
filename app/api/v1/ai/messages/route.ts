// app/api/v1/ai/messages/route.ts
import { NextResponse } from "next/server";
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
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { message, subjectId, topicId } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "message is required (string)" },
      { status: 400 }
    );
  }

  // -------------------------------------
  // 3. PREPARE AI PROMPT
  // -------------------------------------
  const systemPrompt = `
You are StudyBuddy AI. 
Always provide explanations that are clear, concise, and tailored to secondary school students.
If subject/topic hints are given, adjust difficulty level accordingly.
`;

  const userPrompt = `
User Message: ${message}
${subjectId ? `Subject ID: ${subjectId}` : ""}
${topicId ? `Topic ID: ${topicId}` : ""}
`.trim();

  // -------------------------------------
  // 4. CALL OPENAI / GPT
  // -------------------------------------
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  let aiText = "";

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.5,
    });

    aiText =
      completion.choices?.[0]?.message?.content ||
      "I'm sorry — I couldn't generate a response.";
  } catch (err: any) {
    return NextResponse.json(
      { error: "AI generation failed", details: err?.message },
      { status: 500 }
    );
  }

  // -------------------------------------
  // 5. RETURN RESPONSE
  // -------------------------------------
  return NextResponse.json({
    userMessage: message,
    aiResponse: aiText,
    meta: {
      subjectId: subjectId || null,
      topicId: topicId || null,
      userId: dbUser.id,
    },
  });
}
