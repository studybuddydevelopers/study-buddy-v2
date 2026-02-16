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
You are StudyBuddy AI for secondary school students.

Response rules:
- Default to concise answers.
- Respond in 2 to 4 short sentences OR 3 to 6 bullet points.
- If the user asks for "explain", "detail", "why", or "steps", you may be longer.
- Adjust difficulty based on subject/topic hints if provided.

Formatting rules:
- Use short paragraphs or bullet points.
- Use proper line breaks.
- Do NOT separate ideas with hyphens.
- Prefer clean bullet or numbered lists instead of inline lists.
- Keep responses clear, structured, and easy to read.

Do not add extra commentary, filler, or unnecessary context unless asked.
`;

  const userPrompt = `
${message}
${subjectId ? `Subject: ${subjectId}` : ""}
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
      max_tokens: 180,
      temperature: 0.3,
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
