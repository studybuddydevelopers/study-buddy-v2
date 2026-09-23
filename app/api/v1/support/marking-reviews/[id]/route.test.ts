import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  supportAuth: vi.fn(),
  reviewFindUnique: vi.fn(),
  reviewUpdateMany: vi.fn(),
  answerUpdate: vi.fn(),
  answerAggregate: vi.fn(),
  instanceUpdate: vi.fn(),
  instanceFindFirst: vi.fn(),
  progressUpsert: vi.fn(),
  eventCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/marking-review-support", () => ({
  requireMarkingReviewSupport: mocks.supportAuth,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logSecurityEvent: vi.fn(),
  securityFingerprint: vi.fn((value: string) => `fingerprint:${value}`),
}));

vi.mock("@/lib/prisma", () => {
  const transactionClient = {
    mockExamMarkingReview: {
      findUnique: mocks.reviewFindUnique,
      updateMany: mocks.reviewUpdateMany,
    },
    mockExamAnswer: {
      update: mocks.answerUpdate,
      aggregate: mocks.answerAggregate,
    },
    mockExamInstance: {
      update: mocks.instanceUpdate,
      findFirst: mocks.instanceFindFirst,
    },
    progressTrack: { upsert: mocks.progressUpsert },
    mockExamMarkingReviewEvent: { create: mocks.eventCreate },
  };
  return {
    prisma: {
      mockExamMarkingReview: { findUnique: mocks.reviewFindUnique },
      $transaction: mocks.transaction.mockImplementation(
        (callback: (transaction: typeof transactionClient) => unknown) =>
          callback(transactionClient)
      ),
    },
  };
});

const pendingReview = {
  id: "review-1",
  reference: "SBMR-20260923-ABCDEF12",
  status: "PENDING",
  userId: "learner-1",
  mockExamAnswerId: "answer-1",
  mockExamInstanceId: "exam-1",
  originalScore: 5,
  maxScore: 8,
  answer: { score: 5 },
  instance: {
    totalScore: 72,
    template: {
      subjectId: "maths",
      totalMarks: 100,
      questionCount: 13,
    },
  },
};

function resolutionRequest(body: Record<string, unknown>) {
  return new Request(
    "http://localhost/api/v1/support/marking-reviews/review-1",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("support marking-review decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.supportAuth.mockResolvedValue({
      user: { id: "support-1" },
      dbUser: { id: "support-1" },
    });
    mocks.reviewFindUnique.mockResolvedValue(pendingReview);
    mocks.reviewUpdateMany.mockResolvedValue({ count: 1 });
    mocks.answerAggregate.mockResolvedValue({ _sum: { score: 74 } });
    mocks.instanceFindFirst.mockResolvedValue({ id: "exam-1" });
    mocks.transaction.mockImplementation((callback) =>
      callback({
        mockExamMarkingReview: {
          findUnique: mocks.reviewFindUnique,
          updateMany: mocks.reviewUpdateMany,
        },
        mockExamAnswer: {
          update: mocks.answerUpdate,
          aggregate: mocks.answerAggregate,
        },
        mockExamInstance: {
          update: mocks.instanceUpdate,
          findFirst: mocks.instanceFindFirst,
        },
        progressTrack: { upsert: mocks.progressUpsert },
        mockExamMarkingReviewEvent: { create: mocks.eventCreate },
      })
    );
  });

  it("atomically revises the answer, paper total, current progress and audit trail", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      resolutionRequest({
        decision: "ADJUST",
        score: 7,
        note: "Two method marks were omitted from the AI decision.",
      }),
      { params: Promise.resolve({ id: "review-1" }) }
    );

    expect(response).toBeDefined();
    if (!response) throw new Error("Expected a response");
    expect(response.status).toBe(200);
    expect(mocks.reviewUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "review-1", status: "PENDING" },
        data: expect.objectContaining({
          status: "MARK_ADJUSTED",
          revisedScore: 7,
          resolvedByUserId: "support-1",
        }),
      })
    );
    expect(mocks.answerUpdate).toHaveBeenCalledWith({
      where: { id: "answer-1" },
      data: { score: 7, isCorrect: false },
    });
    expect(mocks.instanceUpdate).toHaveBeenCalledWith({
      where: { id: "exam-1" },
      data: { totalScore: 74 },
    });
    expect(mocks.progressUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ progressPercentage: 74 }),
      })
    );
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "MARK_ADJUSTED",
        previousScore: 5,
        newScore: 7,
      }),
    });
  });

  it("does not replace progress when the corrected paper is historical", async () => {
    mocks.instanceFindFirst.mockResolvedValueOnce({ id: "newer-exam" });
    const { PATCH } = await import("./route");
    const response = await PATCH(
      resolutionRequest({
        decision: "ADJUST",
        score: 7,
        note: "Two method marks were omitted from the AI decision.",
      }),
      { params: Promise.resolve({ id: "review-1" }) }
    );

    expect(response).toBeDefined();
    if (!response) throw new Error("Expected a response");
    expect(response.status).toBe(200);
    expect(mocks.instanceUpdate).toHaveBeenCalled();
    expect(mocks.progressUpsert).not.toHaveBeenCalled();
  });

  it("records an approval without rewriting the answer or paper total", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      resolutionRequest({
        decision: "UPHOLD",
        note: "The original mark follows every step in the marking guide.",
      }),
      { params: Promise.resolve({ id: "review-1" }) }
    );

    expect(response).toBeDefined();
    if (!response) throw new Error("Expected a response");
    expect(response.status).toBe(200);
    expect(mocks.answerUpdate).not.toHaveBeenCalled();
    expect(mocks.instanceUpdate).not.toHaveBeenCalled();
    expect(mocks.progressUpsert).not.toHaveBeenCalled();
    expect(mocks.eventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "UPHELD",
        previousScore: 5,
        newScore: 5,
      }),
    });
  });
});
