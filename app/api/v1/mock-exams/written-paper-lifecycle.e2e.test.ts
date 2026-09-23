import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  transaction: vi.fn(),
  rateLimitDeleteMany: vi.fn(),
  templateFindUnique: vi.fn(),
  questionFindMany: vi.fn(),
  instanceCreate: vi.fn(),
  instanceFindUnique: vi.fn(),
  instanceUpdate: vi.fn(),
  instanceUpdateMany: vi.fn(),
  instanceFindFirst: vi.fn(),
  answerCreate: vi.fn(),
  answerFindUnique: vi.fn(),
  answerUpdate: vi.fn(),
  answerAggregate: vi.fn(),
  reviewCreate: vi.fn(),
  reviewFindUnique: vi.fn(),
  reviewFindMany: vi.fn(),
  reviewUpdateMany: vi.fn(),
  progressUpsert: vi.fn(),
  eventCreate: vi.fn(),
}));

const providerMocks = vi.hoisted(() => ({
  generateStructured: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: dbMocks.queryRaw,
    $transaction: dbMocks.transaction,
    rateLimitBucket: { deleteMany: dbMocks.rateLimitDeleteMany },
    mockExamTemplate: { findUnique: dbMocks.templateFindUnique },
    pastQuestion: { findMany: dbMocks.questionFindMany },
    mockExamInstance: {
      create: dbMocks.instanceCreate,
      findUnique: dbMocks.instanceFindUnique,
      update: dbMocks.instanceUpdate,
      updateMany: dbMocks.instanceUpdateMany,
      findFirst: dbMocks.instanceFindFirst,
    },
    mockExamAnswer: {
      create: dbMocks.answerCreate,
      findUnique: dbMocks.answerFindUnique,
      update: dbMocks.answerUpdate,
      aggregate: dbMocks.answerAggregate,
    },
    mockExamMarkingReview: {
      create: dbMocks.reviewCreate,
      findUnique: dbMocks.reviewFindUnique,
      findMany: dbMocks.reviewFindMany,
      updateMany: dbMocks.reviewUpdateMany,
    },
    progressTrack: { upsert: dbMocks.progressUpsert },
    mockExamMarkingReviewEvent: { create: dbMocks.eventCreate },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn().mockResolvedValue({
    user: { id: "learner-1" },
    dbUser: { id: "learner-1", aiAccessAuthorized: true },
  }),
  requireAiUser: vi.fn().mockResolvedValue({
    user: { id: "learner-1" },
    dbUser: { id: "learner-1", aiAccessAuthorized: true },
  }),
}));

vi.mock("@/lib/marking-review-support", () => ({
  requireMarkingReviewSupport: vi.fn().mockResolvedValue({
    user: { id: "support-1" },
    dbUser: { id: "support-1" },
  }),
}));

vi.mock("@/lib/ai/chat/provider", () => ({
  getChatModelProvider: vi.fn(() => ({
    generate: vi.fn(),
    generateStructured: providerMocks.generateStructured,
  })),
}));

vi.mock("@/lib/security/audit-log", () => ({
  logSecurityEvent: vi.fn(),
  securityFingerprint: vi.fn((value: string) => `fingerprint:${value}`),
}));

import { POST as startExam } from "./start/route";
import { POST as submitExam } from "./submit/route";
import { POST as markExam } from "./ai-mark/route";
import { POST as createReview } from "./marking-reviews/route";
import { PATCH as resolveReview } from "../support/marking-reviews/[id]/route";

interface TestQuestion {
  id: string;
  subjectId: string;
  questionText: string;
  questionImageUrl: null;
  answerText: string;
  explanationText: string;
  year: number;
  questionNumber: string;
  difficulty: number;
  topicId: string;
}

interface TestInstance {
  id: string;
  userId: string;
  templateId: string;
  startedAt: Date;
  submittedAt: Date | null;
  totalScore: number | null;
  graded: boolean;
  aiCreditReservedAt: Date | null;
}

interface TestAnswer {
  id: string;
  mockExamInstanceId: string;
  pastQuestionId: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
  aiExplanation: string | null;
  score: number | null;
  section: "PART_I" | "PART_II";
  displayOrder: number;
  maxScore: number;
}

interface TestReview {
  id: string;
  reference: string;
  userId: string;
  mockExamInstanceId: string;
  mockExamAnswerId: string;
  status: "PENDING" | "UPHELD" | "MARK_ADJUSTED";
  learnerReason: string;
  originalScore: number;
  revisedScore: number | null;
  maxScore: number;
  paperTitleSnapshot: string;
  subjectNameSnapshot: string;
  questionReferenceSnapshot: string;
  questionTextSnapshot: string;
  learnerAnswerSnapshot: string;
  modelAnswerSnapshot: string;
  markingGuideSnapshot: string;
  aiRationaleSnapshot: string;
  resolvedByUserId: string | null;
  resolutionNote: string | null;
  submittedAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface TestReviewEvent {
  id: string;
  reviewId: string;
  eventType: "SUBMITTED" | "UPHELD" | "MARK_ADJUSTED";
  actorType: "LEARNER" | "SUPPORT";
  actorUserId: string | null;
  previousScore: number | null;
  newScore: number | null;
  note: string | null;
  createdAt: Date;
}

const template = {
  id: "paper-2-template",
  subjectId: "maths",
  title: "WAEC Mathematics Paper 2",
  description: "Written mathematics practice",
  questionCount: 13,
  format: "WRITTEN" as const,
  durationMinutes: 150,
  totalMarks: 100,
  requiredQuestionCount: 10,
};

const subject = { id: "maths", name: "Mathematics" };

const questions: TestQuestion[] = Array.from({ length: 13 }, (_, index) => {
  const partOne = index < 5;
  const number = partOne ? index + 1 : index - 4;
  return {
    id: `question-${index + 1}`,
    subjectId: "maths",
    questionText: `Solve written question ${index + 1}.`,
    questionImageUrl: null,
    answerText: `Model answer ${index + 1}`,
    explanationText: `Award marks for the valid steps in question ${index + 1}.`,
    year: 2025,
    questionNumber: `P2-${partOne ? "I" : "II"}-${number}`,
    difficulty: 2,
    topicId: "algebra",
  };
});

const state = {
  dailyCreditsUsed: 0,
  instanceSequence: 0,
  answerSequence: 0,
  eventSequence: 0,
  instances: [] as TestInstance[],
  answers: [] as TestAnswer[],
  reviews: [] as TestReview[],
  reviewEvents: [] as TestReviewEvent[],
  progress: new Map<string, number>(),
};

function resetState() {
  state.dailyCreditsUsed = 0;
  state.instanceSequence = 0;
  state.answerSequence = 0;
  state.eventSequence = 0;
  state.instances.length = 0;
  state.answers.length = 0;
  state.reviews.length = 0;
  state.reviewEvents.length = 0;
  state.progress.clear();
}

function questionFor(answer: TestAnswer) {
  return questions.find((question) => question.id === answer.pastQuestionId)!;
}

function instancePayload(instance: TestInstance) {
  return {
    ...instance,
    template: { ...template, subject },
    answers: state.answers
      .filter((answer) => answer.mockExamInstanceId === instance.id)
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((answer) => ({ ...answer, question: questionFor(answer) })),
  };
}

function answerPayload(answer: TestAnswer) {
  const instance = state.instances.find(
    (candidate) => candidate.id === answer.mockExamInstanceId
  )!;
  const review = state.reviews.find(
    (candidate) => candidate.mockExamAnswerId === answer.id
  );
  return {
    ...answer,
    question: questionFor(answer),
    instance: instancePayload(instance),
    markingReview: review ?? null,
  };
}

function reviewPayload(review: TestReview) {
  const answer = state.answers.find(
    (candidate) => candidate.id === review.mockExamAnswerId
  )!;
  const instance = state.instances.find(
    (candidate) => candidate.id === review.mockExamInstanceId
  )!;
  return {
    ...review,
    learner: {
      profile: { firstName: "Ada", lastNames: "Okafor" },
    },
    answer,
    instance: instancePayload(instance),
    events: state.reviewEvents.filter((event) => event.reviewId === review.id),
  };
}

function configureInMemoryDatabase() {
  dbMocks.templateFindUnique.mockResolvedValue(template);
  dbMocks.questionFindMany.mockResolvedValue(questions);
  dbMocks.rateLimitDeleteMany.mockResolvedValue({ count: 0 });

  dbMocks.queryRaw.mockImplementation(async (query: unknown) => {
    const sql = query as {
      strings?: readonly string[];
      values?: readonly unknown[];
    };
    const statement = sql.strings?.join("?") ?? "";
    if (statement.includes('"AiDailyUsage"')) {
      const units = Number(sql.values?.[2] ?? 1);
      const limit = Number(sql.values?.at(-1) ?? 50);
      if (state.dailyCreditsUsed + units > limit) return [];
      state.dailyCreditsUsed += units;
      return [{ requestCount: state.dailyCreditsUsed }];
    }
    if (statement.includes('"RateLimitBucket"')) return [{ count: 1 }];
    throw new Error(`Unexpected raw query in lifecycle test: ${statement}`);
  });

  dbMocks.instanceCreate.mockImplementation(async ({ data }) => {
    const instance: TestInstance = {
      id: `exam-${++state.instanceSequence}`,
      userId: data.userId,
      templateId: data.templateId,
      startedAt: new Date(Date.now() + state.instanceSequence),
      submittedAt: null,
      totalScore: null,
      graded: false,
      aiCreditReservedAt: data.aiCreditReservedAt,
    };
    state.instances.push(instance);
    return instance;
  });

  dbMocks.answerCreate.mockImplementation(async ({ data }) => {
    const answer: TestAnswer = {
      id: `answer-${++state.answerSequence}`,
      mockExamInstanceId: data.mockExamInstanceId,
      pastQuestionId: data.pastQuestionId,
      userAnswer: null,
      isCorrect: null,
      aiExplanation: null,
      score: null,
      section: data.section,
      displayOrder: data.displayOrder,
      maxScore: data.maxScore,
    };
    state.answers.push(answer);
    return answer;
  });

  dbMocks.instanceFindUnique.mockImplementation(async ({ where }) => {
    const instance = state.instances.find((candidate) => candidate.id === where.id);
    return instance ? instancePayload(instance) : null;
  });

  dbMocks.instanceUpdate.mockImplementation(async ({ where, data }) => {
    const instance = state.instances.find((candidate) => candidate.id === where.id)!;
    Object.assign(instance, data);
    return instancePayload(instance);
  });

  dbMocks.instanceUpdateMany.mockImplementation(async ({ where, data }) => {
    const instance = state.instances.find((candidate) => candidate.id === where.id);
    if (
      !instance ||
      (where.userId && instance.userId !== where.userId) ||
      (where.graded === false && instance.graded) ||
      (where.submittedAt?.not === null && instance.submittedAt === null)
    ) {
      return { count: 0 };
    }
    Object.assign(instance, data);
    return { count: 1 };
  });

  dbMocks.instanceFindFirst.mockImplementation(async ({ where }) => {
    const matches = state.instances
      .filter(
        (instance) =>
          instance.userId === where.userId && instance.graded === where.graded
      )
      .sort((left, right) => {
        const submittedDifference =
          (right.submittedAt?.getTime() ?? 0) -
          (left.submittedAt?.getTime() ?? 0);
        return submittedDifference || right.startedAt.getTime() - left.startedAt.getTime();
      });
    return matches[0] ? { id: matches[0].id } : null;
  });

  dbMocks.answerFindUnique.mockImplementation(async ({ where }) => {
    const answer = state.answers.find((candidate) => candidate.id === where.id);
    return answer ? answerPayload(answer) : null;
  });

  dbMocks.answerUpdate.mockImplementation(async ({ where, data }) => {
    const answer = state.answers.find((candidate) => candidate.id === where.id)!;
    Object.assign(answer, data);
    return answer;
  });

  dbMocks.answerAggregate.mockImplementation(async ({ where }) => ({
    _sum: {
      score: state.answers
        .filter((answer) => answer.mockExamInstanceId === where.mockExamInstanceId)
        .reduce((total, answer) => total + (answer.score ?? 0), 0),
    },
  }));

  dbMocks.reviewCreate.mockImplementation(async ({ data }) => {
    const now = new Date();
    const review: TestReview = {
      id: data.id,
      reference: data.reference,
      userId: data.userId,
      mockExamInstanceId: data.mockExamInstanceId,
      mockExamAnswerId: data.mockExamAnswerId,
      status: "PENDING",
      learnerReason: data.learnerReason,
      originalScore: data.originalScore,
      revisedScore: null,
      maxScore: data.maxScore,
      paperTitleSnapshot: data.paperTitleSnapshot,
      subjectNameSnapshot: data.subjectNameSnapshot,
      questionReferenceSnapshot: data.questionReferenceSnapshot,
      questionTextSnapshot: data.questionTextSnapshot,
      learnerAnswerSnapshot: data.learnerAnswerSnapshot,
      modelAnswerSnapshot: data.modelAnswerSnapshot,
      markingGuideSnapshot: data.markingGuideSnapshot,
      aiRationaleSnapshot: data.aiRationaleSnapshot,
      resolvedByUserId: null,
      resolutionNote: null,
      submittedAt: now,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    state.reviews.push(review);
    if (data.events?.create) {
      state.reviewEvents.push({
        id: `event-${++state.eventSequence}`,
        reviewId: review.id,
        createdAt: now,
        ...data.events.create,
      });
    }
    return review;
  });

  dbMocks.reviewFindUnique.mockImplementation(async ({ where }) => {
    const review = state.reviews.find((candidate) =>
      where.id
        ? candidate.id === where.id
        : candidate.mockExamAnswerId === where.mockExamAnswerId
    );
    return review ? reviewPayload(review) : null;
  });
  dbMocks.reviewFindMany.mockImplementation(async () =>
    state.reviews.map(reviewPayload)
  );
  dbMocks.reviewUpdateMany.mockImplementation(async ({ where, data }) => {
    const review = state.reviews.find((candidate) => candidate.id === where.id);
    if (!review || review.status !== where.status) return { count: 0 };
    Object.assign(review, data, { updatedAt: new Date() });
    return { count: 1 };
  });

  dbMocks.progressUpsert.mockImplementation(async ({ where, update, create }) => {
    const key = `${where.userId_subjectId.userId}:${where.userId_subjectId.subjectId}`;
    const progressPercentage = state.progress.has(key)
      ? update.progressPercentage
      : create.progressPercentage;
    state.progress.set(key, progressPercentage);
    return { ...create, progressPercentage };
  });

  dbMocks.eventCreate.mockImplementation(async ({ data }) => {
    const event: TestReviewEvent = {
      id: `event-${++state.eventSequence}`,
      reviewId: data.reviewId,
      eventType: data.eventType,
      actorType: data.actorType,
      actorUserId: data.actorUserId,
      previousScore: data.previousScore,
      newScore: data.newScore,
      note: data.note,
      createdAt: new Date(),
    };
    state.reviewEvents.push(event);
    return event;
  });

  const transactionClient = {
    mockExamInstance: {
      update: dbMocks.instanceUpdate,
      updateMany: dbMocks.instanceUpdateMany,
      findFirst: dbMocks.instanceFindFirst,
    },
    mockExamAnswer: {
      update: dbMocks.answerUpdate,
      aggregate: dbMocks.answerAggregate,
    },
    mockExamMarkingReview: {
      findUnique: dbMocks.reviewFindUnique,
      updateMany: dbMocks.reviewUpdateMany,
    },
    progressTrack: { upsert: dbMocks.progressUpsert },
    mockExamMarkingReviewEvent: { create: dbMocks.eventCreate },
  };

  dbMocks.transaction.mockImplementation(async (operation) => {
    if (Array.isArray(operation)) return Promise.all(operation);
    return operation(transactionClient);
  });
}

function successfulMarkingResult() {
  const instance = state.instances.find(
    (candidate) => candidate.submittedAt && !candidate.graded
  )!;
  const marks = state.answers
    .filter(
      (answer) =>
        answer.mockExamInstanceId === instance.id && answer.userAnswer?.trim()
    )
    .map((answer) => ({
      answerId: answer.id,
      score: answer.maxScore - 1,
      rationale: "The main method is correct; one accuracy mark is missing.",
      confidence: "HIGH",
    }));
  return {
    value: { marks },
    provider: "test-provider",
    model: "test-marker",
  };
}

async function requireResponse(responsePromise: Promise<Response | undefined>) {
  const response = await responsePromise;
  if (!response) throw new Error("Expected a route response");
  return response;
}

async function startWrittenPaper() {
  return requireResponse(
    startExam(
      new Request("http://localhost/api/v1/mock-exams/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      })
    )
  );
}

async function submitWrittenPaper(instanceId: string) {
  const answers = state.answers
    .filter((answer) => answer.mockExamInstanceId === instanceId)
    .map((answer) => ({
      answerId: answer.id,
      userAnswer:
        answer.section === "PART_I" || answer.displayOrder <= 10
          ? `Learner working for ${answer.id}`
          : "",
    }));
  return requireResponse(
    submitExam(
      new Request("http://localhost/api/v1/mock-exams/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, answers }),
      })
    )
  );
}

async function completeMarkedPaper() {
  const startResponse = await startWrittenPaper();
  const startBody = await startResponse.json();
  await submitWrittenPaper(startBody.instance.id);
  providerMocks.generateStructured.mockResolvedValueOnce(successfulMarkingResult());
  const markResponse = await requireResponse(
    markExam(
      new Request("http://localhost/api/v1/mock-exams/ai-mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId: startBody.instance.id }),
      })
    )
  );
  expect(markResponse.status).toBe(200);
  return state.instances.find((instance) => instance.id === startBody.instance.id)!;
}

describe("written mock-exam lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T12:00:00.000Z"));
    vi.stubEnv("AI_DAILY_USER_QUOTA", "50");
    vi.clearAllMocks();
    resetState();
    configureInMemoryDatabase();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("reserves five credits and records that reservation on the written-paper instance", async () => {
    const response = await startWrittenPaper();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(state.dailyCreditsUsed).toBe(5);
    expect(state.instances).toHaveLength(1);
    expect(state.instances[0].aiCreditReservedAt).toEqual(
      new Date("2026-09-23T12:00:00.000Z")
    );
    expect(body.instance.id).toBe(state.instances[0].id);
  });

  it("rejects a written paper before creating it when fewer than five credits remain", async () => {
    state.dailyCreditsUsed = 46;

    const response = await startWrittenPaper();
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      error: "RATE_LIMITED",
      message: expect.stringContaining("at least 5 AI credits"),
    });
    expect(state.dailyCreditsUsed).toBe(46);
    expect(state.instances).toHaveLength(0);
    expect(state.answers).toHaveLength(0);
  });

  it("charges another five credits when the learner starts the same paper again", async () => {
    const firstResponse = await startWrittenPaper();
    const secondResponse = await startWrittenPaper();

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(state.dailyCreditsUsed).toBe(10);
    expect(state.instances).toHaveLength(2);
    expect(state.instances[0].templateId).toBe(template.id);
    expect(state.instances[1].templateId).toBe(template.id);
    expect(state.instances.every((instance) => instance.aiCreditReservedAt)).toBe(
      true
    );
  });

  it("allows failed marking to retry without consuming another five credits", async () => {
    const startResponse = await startWrittenPaper();
    const startBody = await startResponse.json();
    await submitWrittenPaper(startBody.instance.id);

    providerMocks.generateStructured
      .mockRejectedValueOnce(new Error("temporary provider failure"))
      .mockResolvedValueOnce(successfulMarkingResult());

    const firstMarking = await requireResponse(
      markExam(
        new Request("http://localhost/api/v1/mock-exams/ai-mark", {
          method: "POST",
          body: JSON.stringify({ instanceId: startBody.instance.id }),
        })
      )
    );
    expect(firstMarking.status).toBe(503);
    expect(state.instances[0]).toMatchObject({ graded: false, totalScore: null });
    expect(state.dailyCreditsUsed).toBe(5);

    const retry = await requireResponse(
      markExam(
        new Request("http://localhost/api/v1/mock-exams/ai-mark", {
          method: "POST",
          body: JSON.stringify({ instanceId: startBody.instance.id }),
        })
      )
    );
    const retryBody = await retry.json();

    expect(retry.status).toBe(200);
    expect(retryBody).toMatchObject({ graded: true, totalScore: 90 });
    expect(state.instances[0]).toMatchObject({ graded: true, totalScore: 90 });
    expect(state.dailyCreditsUsed).toBe(5);
    expect(providerMocks.generateStructured).toHaveBeenCalledTimes(2);
  });

  it("carries a reviewed-score correction through the case, paper, progress and audit trail", async () => {
    const instance = await completeMarkedPaper();
    const answer = state.answers.find(
      (candidate) =>
        candidate.mockExamInstanceId === instance.id &&
        candidate.section === "PART_I"
    )!;
    expect(answer.score).toBe(7);
    expect(instance.totalScore).toBe(90);

    const reviewResponse = await requireResponse(
      createReview(
        new Request("http://localhost/api/v1/mock-exams/marking-reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answerId: answer.id,
            reason: "The final accuracy mark is supported by the submitted working.",
          }),
        })
      )
    );
    const reviewBody = await reviewResponse.json();
    expect(reviewResponse.status).toBe(201);
    expect(reviewBody.review.status).toBe("PENDING");

    const correctionResponse = await requireResponse(
      resolveReview(
        new Request(
          `http://localhost/api/v1/support/marking-reviews/${reviewBody.review.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              decision: "ADJUST",
              score: 8,
              note: "The final line earns the omitted accuracy mark.",
            }),
          }
        ),
        { params: Promise.resolve({ id: reviewBody.review.id }) }
      )
    );
    const correctionBody = await correctionResponse.json();
    const storedReview = state.reviews[0];

    expect(correctionResponse.status).toBe(200);
    expect(correctionBody.review).toMatchObject({
      status: "MARK_ADJUSTED",
      originalScore: 7,
      revisedScore: 8,
      paperTotal: 91,
      progressRecalculated: true,
    });
    expect(answer).toMatchObject({ score: 8, isCorrect: true });
    expect(instance.totalScore).toBe(91);
    expect(state.progress.get("learner-1:maths")).toBe(91);
    expect(storedReview).toMatchObject({
      status: "MARK_ADJUSTED",
      originalScore: 7,
      revisedScore: 8,
    });
    expect(state.reviewEvents).toMatchObject([
      {
        eventType: "SUBMITTED",
        actorType: "LEARNER",
        previousScore: 7,
        newScore: 7,
      },
      {
        eventType: "MARK_ADJUSTED",
        actorType: "SUPPORT",
        previousScore: 7,
        newScore: 8,
      },
    ]);
  });
});
