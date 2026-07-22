import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const MAX_DRAFTS_PER_REQUEST = 25;
const MAX_ANSWER_LENGTH = 10_000;

interface DraftUpdate {
  questionId: string;
  answerText: string;
}

function parseDraftUpdates(body: unknown): DraftUpdate[] | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const record = body as Record<string, unknown>;
  const rawDrafts = Array.isArray(record.drafts) ? record.drafts : [record];

  if (rawDrafts.length > MAX_DRAFTS_PER_REQUEST) return null;

  const updates = new Map<string, DraftUpdate>();
  for (const draft of rawDrafts) {
    if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
      return null;
    }

    const item = draft as Record<string, unknown>;
    if (typeof item.questionId !== "string" || item.questionId.length === 0) {
      return null;
    }
    if (typeof item.answerText !== "string") {
      return null;
    }
    if (item.answerText.length > MAX_ANSWER_LENGTH) {
      return null;
    }

    updates.set(item.questionId, {
      questionId: item.questionId,
      answerText: item.answerText,
    });
  }

  return Array.from(updates.values());
}

export async function GET(req: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  const searchParams = new URL(req.url).searchParams;
  const topicId = searchParams.get("topicId");
  if (!topicId) {
    return NextResponse.json(
      { error: "topicId query parameter is required" },
      { status: 400 }
    );
  }

  const requestedQuestionIds = [
    ...searchParams.getAll("questionId"),
    ...(searchParams.get("questionIds")?.split(",") ?? []),
  ]
    .map((id) => id.trim())
    .filter(Boolean);

  if (requestedQuestionIds.length > MAX_DRAFTS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Request up to ${MAX_DRAFTS_PER_REQUEST} question drafts` },
      { status: 400 }
    );
  }

  const questions = await prisma.pastQuestion.findMany({
    where: {
      topicId,
      ...(requestedQuestionIds.length > 0
        ? { id: { in: requestedQuestionIds } }
        : {}),
    },
    select: { id: true },
  });
  const questionIds = questions.map((question) => question.id);

  if (
    requestedQuestionIds.length > 0 &&
    questionIds.length !== new Set(requestedQuestionIds).size
  ) {
    return NextResponse.json(
      { error: "One or more questions were not found for this topic" },
      { status: 404 }
    );
  }

  if (questionIds.length === 0) {
    return NextResponse.json({ drafts: [] });
  }

  const drafts = await prisma.practiceAnswerDraft.findMany({
    where: {
      userId: dbUser.id,
      questionId: { in: questionIds },
    },
    select: {
      questionId: true,
      answerText: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    drafts: drafts.map((draft) => ({
      questionId: draft.questionId,
      answerText: draft.answerText,
      updatedAt: draft.updatedAt.toISOString(),
    })),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  const settings = await prisma.userSettings.findUnique({
    where: { userId: dbUser.id },
    select: {
      cloudPracticeDraftsEnabled: true,
      lowDataModeEnabled: true,
    },
  });

  if (!settings?.cloudPracticeDraftsEnabled || settings.lowDataModeEnabled) {
    return NextResponse.json({
      saved: false,
      reason: "cloud_sync_disabled",
    });
  }

  const body = await req.json().catch(() => null);
  const updates = parseDraftUpdates(body);
  if (!updates) {
    return NextResponse.json(
      {
        error:
          "Expected up to 25 drafts with string questionId and answerText fields",
      },
      { status: 400 }
    );
  }

  if (updates.length === 0) {
    return NextResponse.json({ saved: true, savedCount: 0, deletedCount: 0 });
  }

  const questionIds = updates.map((draft) => draft.questionId);
  const existingQuestions = await prisma.pastQuestion.findMany({
    where: { id: { in: questionIds } },
    select: { id: true },
  });

  if (existingQuestions.length !== questionIds.length) {
    return NextResponse.json(
      { error: "One or more questions were not found" },
      { status: 404 }
    );
  }

  const blankQuestionIds = updates
    .filter((draft) => draft.answerText.trim().length === 0)
    .map((draft) => draft.questionId);
  const nonBlankDrafts = updates.filter(
    (draft) => draft.answerText.trim().length > 0
  );

  await prisma.$transaction([
    ...(blankQuestionIds.length > 0
      ? [
          prisma.practiceAnswerDraft.deleteMany({
            where: {
              userId: dbUser.id,
              questionId: { in: blankQuestionIds },
            },
          }),
        ]
      : []),
    ...nonBlankDrafts.map((draft) =>
      prisma.practiceAnswerDraft.upsert({
        where: {
          userId_questionId: {
            userId: dbUser.id,
            questionId: draft.questionId,
          },
        },
        create: {
          userId: dbUser.id,
          questionId: draft.questionId,
          answerText: draft.answerText,
        },
        update: {
          answerText: draft.answerText,
        },
      })
    ),
  ]);

  return NextResponse.json({
    saved: true,
    savedCount: nonBlankDrafts.length,
    deletedCount: blankQuestionIds.length,
  });
}
