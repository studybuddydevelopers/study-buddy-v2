// lib/whatsapp-flow.ts
// Conversation routing for the WhatsApp WAEC tutoring bot.
import { prisma } from "@/lib/prisma";
import { getOrCreateWhatsAppUser } from "@/lib/whatsapp-user";
import { getOrCreateWhatsAppThread } from "@/lib/whatsapp-thread";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const SYSTEM_PROMPT =
  "You are Study Buddy, an AI tutor helping Nigerian secondary school students prepare for WAEC exams. " +
  "You specialise in Mathematics and Biology. Keep answers concise and use plain text only — no LaTeX, " +
  "no markdown, no bullet symbols. Use simple notation like x^2, sqrt(), 3/4. Be encouraging and direct.";

const MENU_REPLY = (name: string) =>
  `Hi ${name}! 👋 I'm Study Buddy, your WAEC exam assistant.

Here's what I can help you with:

1. Practice questions
2. Exam tips
3. Solve a problem

Just reply with a number or tell me what you need.`;

const PRACTICE_REPLY = `Sure! Which topic would you like to practice?

And what difficulty?
- Easy
- Medium
- Hard`;

const TIPS_REPLY = `Which topic would you like exam tips for?`;

const SOLVE_REPLY = `Send me the problem and I'll help.

Would you like:
A) Just the answer
B) Step-by-step explanation`;

function classifyIntent(normalizedText: string): "menu" | "practice" | "tips" | "solve" | "ai" {
  if (["menu", "hi", "hello"].includes(normalizedText)) return "menu";
  if (normalizedText === "1" || normalizedText === "practice") return "practice";
  if (normalizedText === "2" || normalizedText === "exam tips") return "tips";
  if (normalizedText === "3" || normalizedText === "solve") return "solve";
  return "ai";
}

async function saveMessage(
  aiQuestionId: string,
  sender: "user" | "ai",
  message: string
) {
  await prisma.aiQuestionMessage.create({
    data: { aiQuestionId, sender, message },
  });
}

async function generateAiReply(aiQuestionId: string): Promise<string> {
  const previousMessages = await prisma.aiQuestionMessage.findMany({
    where: { aiQuestionId },
    orderBy: { createdAt: "asc" },
  });

  const openAIMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...previousMessages.map((m) => ({
      role: m.sender === "ai" ? ("assistant" as const) : ("user" as const),
      content: m.message,
    })),
  ];

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openAIMessages,
      max_tokens: 300,
      temperature: 0.4,
    });

    return (
      completion.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response. Please try again."
    );
  } catch (err) {
    console.error("WHATSAPP AI REPLY ERROR:", err);
    return "Sorry, something went wrong on my end. Please try again in a moment.";
  }
}

export async function handleIncomingMessage(
  from: string,
  text: string
): Promise<string> {
  const userId = await getOrCreateWhatsAppUser(from);
  const aiQuestionId = await getOrCreateWhatsAppThread(userId);

  const existingMessageCount = await prisma.aiQuestionMessage.count({
    where: { aiQuestionId },
  });
  const isFirstMessage = existingMessageCount === 0;

  const normalizedText = text.trim().toLowerCase();
  const intent = isFirstMessage ? "menu" : classifyIntent(normalizedText);

  await saveMessage(aiQuestionId, "user", text);

  let reply: string;

  switch (intent) {
    case "menu": {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      const name = user?.profile?.firstName ?? "there";
      reply = MENU_REPLY(name);
      break;
    }
    case "practice":
      reply = PRACTICE_REPLY;
      break;
    case "tips":
      reply = TIPS_REPLY;
      break;
    case "solve":
      reply = SOLVE_REPLY;
      break;
    case "ai":
    default:
      reply = await generateAiReply(aiQuestionId);
      break;
  }

  await saveMessage(aiQuestionId, "ai", reply);

  return reply;
}
