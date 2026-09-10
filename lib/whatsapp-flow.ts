// lib/whatsapp-flow.ts
// Conversation routing for the WhatsApp WAEC tutoring bot.
import { prisma } from "@/lib/prisma";
import { getOrCreateWhatsAppUser } from "@/lib/whatsapp-user";
import {
  deleteWhatsAppConversation,
  findWhatsAppThread,
  getOrCreateWhatsAppThread,
} from "@/lib/whatsapp-thread";
import {
  getWhatsAppDeletionConfirmationCutoff,
  getWhatsAppConversationCommand,
  selectRecentWhatsAppContext,
  WHATSAPP_DELETE_CONFIRM_COMMAND,
  WHATSAPP_DELETE_CONFIRMATION_MINUTES,
  WHATSAPP_DELETE_REQUEST_COMMAND,
} from "@/lib/whatsapp-retention";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { enforceAiAccountLimits } from "@/lib/security/rate-limit";
import { openAiClientOptions } from "@/lib/security/timeouts";
import {
  logSecurityEvent,
  securityFingerprint,
} from "@/lib/security/audit-log";
import {
  GlobalAiBudgetExceededError,
  withGlobalAiTokenBudget,
} from "@/lib/security/ai-budget";

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

Just reply with a number or tell me what you need.

To delete your saved WhatsApp conversation, send DELETE MY CHAT.`;

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
  const newestMessages = await prisma.aiQuestionMessage.findMany({
    where: { aiQuestionId },
    orderBy: { createdAt: "desc" },
    take: 24,
  });
  const previousMessages = selectRecentWhatsAppContext(newestMessages);

  const openAIMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...previousMessages.map((m) => ({
      role: m.sender === "ai" ? ("assistant" as const) : ("user" as const),
      content: m.message,
    })),
  ];

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    ...openAiClientOptions(),
  });

  try {
    const completion = await withGlobalAiTokenBudget({
      promptMaterial: openAIMessages,
      maxOutputTokens: 300,
      operation: () => client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: openAIMessages,
        max_tokens: 300,
        temperature: 0.4,
      }),
      readActualTokens: (result) => result.usage?.total_tokens,
    });

    return (
      completion.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response. Please try again."
    );
  } catch (error) {
    if (error instanceof GlobalAiBudgetExceededError) {
      return "The AI service has reached its daily usage limit. Please try again tomorrow.";
    }
    logSecurityEvent("whatsapp_ai_generation_failed", "error");
    return "Sorry, something went wrong on my end. Please try again in a moment.";
  }
}

export async function handleIncomingMessage(
  from: string,
  text: string
): Promise<string> {
  const conversationCommand = getWhatsAppConversationCommand(text);
  if (conversationCommand) {
    const existingUser = await prisma.user.findUnique({
      where: { whatsappPhone: from },
      select: { id: true },
    });

    if (!existingUser) {
      return "You do not have a saved Study Buddy WhatsApp conversation to delete.";
    }
    const existingThreadId = await findWhatsAppThread(existingUser.id);
    if (!existingThreadId) {
      return "You do not have a saved Study Buddy WhatsApp conversation to delete.";
    }
    if (conversationCommand === "delete-request") {
      await saveMessage(
        existingThreadId,
        "user",
        WHATSAPP_DELETE_REQUEST_COMMAND
      );
      return `To permanently delete only your saved Study Buddy WhatsApp conversation, reply within ${WHATSAPP_DELETE_CONFIRMATION_MINUTES} minutes with exactly: ${WHATSAPP_DELETE_CONFIRM_COMMAND}. This cannot be undone. Your account and other study records will remain.`;
    }

    const pendingRequest = await prisma.aiQuestionMessage.findFirst({
      where: {
        aiQuestionId: existingThreadId,
        sender: "user",
        message: WHATSAPP_DELETE_REQUEST_COMMAND,
        createdAt: { gte: getWhatsAppDeletionConfirmationCutoff() },
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });
    if (!pendingRequest) {
      return `Your deletion confirmation is missing or expired. First send ${WHATSAPP_DELETE_REQUEST_COMMAND}, then confirm within ${WHATSAPP_DELETE_CONFIRMATION_MINUTES} minutes.`;
    }

    const deleted = await deleteWhatsAppConversation(existingUser.id);
    if (deleted > 0) {
      logSecurityEvent("whatsapp_conversation_deleted", "info", {
        accountFingerprint: securityFingerprint(existingUser.id),
      });
    }
    return deleted > 0
      ? "Your saved Study Buddy WhatsApp conversation has been permanently deleted. Your account and other study records remain."
      : "You do not have a saved Study Buddy WhatsApp conversation to delete.";
  }

  const user = await getOrCreateWhatsAppUser(from);
  if (user.accountStatus !== "ACTIVE") {
    return "This Study Buddy account is not active. Sign in on studybuddyng.com to review your account status.";
  }
  const userId = user.id;
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
      if (await enforceAiAccountLimits(userId)) {
        reply = "You've reached the AI usage limit. Please try again later.";
        break;
      }
      reply = await generateAiReply(aiQuestionId);
      break;
  }

  await saveMessage(aiQuestionId, "ai", reply);

  return reply;
}
