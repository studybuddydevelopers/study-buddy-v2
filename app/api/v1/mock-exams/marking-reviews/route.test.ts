import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  answerFindUnique: vi.fn(),
  reviewCreate: vi.fn(),
  reviewFindUnique: vi.fn(),
  reviewFindMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn().mockResolvedValue({
    user: { id: "learner-1" },
    dbUser: { id: "learner-1" },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mockExamAnswer: { findUnique: prismaMocks.answerFindUnique },
    mockExamMarkingReview: {
      create: prismaMocks.reviewCreate,
      findUnique: prismaMocks.reviewFindUnique,
      findMany: prismaMocks.reviewFindMany,
    },
  },
}));

describe("learner marking reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.answerFindUnique.mockResolvedValue({
      id: "answer-1",
      mockExamInstanceId: "exam-1",
      userAnswer: "I expanded the brackets and obtained x = 4.",
      score: 5,
      maxScore: 8,
      aiExplanation: "Method was correct but the final substitution was missing.",
      section: "PART_I",
      displayOrder: 1,
      markingReview: null,
      question: {
        questionText: "Solve the equation.",
        questionNumber: "P2-I-1",
        answerText: "x = 4",
        explanationText: "Award method marks and one accuracy mark.",
      },
      instance: {
        userId: "learner-1",
        graded: true,
        template: {
          title: "WAEC Mathematics Paper 2",
          format: "WRITTEN",
          subject: { name: "Mathematics" },
        },
      },
    });
    prismaMocks.reviewCreate.mockImplementation(async ({ data }) => ({
      id: data.id,
      reference: data.reference,
      status: "PENDING",
      mockExamInstanceId: data.mockExamInstanceId,
      questionReferenceSnapshot: data.questionReferenceSnapshot,
      paperTitleSnapshot: data.paperTitleSnapshot,
      subjectNameSnapshot: data.subjectNameSnapshot,
      originalScore: data.originalScore,
      revisedScore: null,
      maxScore: data.maxScore,
      resolutionNote: null,
      submittedAt: new Date("2026-09-23T12:00:00.000Z"),
      resolvedAt: null,
    }));
  });

  it("snapshots all evidence and creates the first audit event", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/v1/mock-exams/marking-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answerId: "answer-1",
          reason: "The final answer is present and should receive the accuracy mark.",
        }),
      })
    );

    expect(response).toBeDefined();
    if (!response) throw new Error("Expected a response");
    expect(response.status).toBe(201);
    const create = prismaMocks.reviewCreate.mock.calls[0][0].data;
    expect(create).toMatchObject({
      userId: "learner-1",
      mockExamInstanceId: "exam-1",
      mockExamAnswerId: "answer-1",
      originalScore: 5,
      maxScore: 8,
      paperTitleSnapshot: "WAEC Mathematics Paper 2",
      subjectNameSnapshot: "Mathematics",
      questionTextSnapshot: "Solve the equation.",
      learnerAnswerSnapshot: "I expanded the brackets and obtained x = 4.",
      modelAnswerSnapshot: "x = 4",
      markingGuideSnapshot: "Award method marks and one accuracy mark.",
      aiRationaleSnapshot:
        "Method was correct but the final substitution was missing.",
      events: {
        create: {
          eventType: "SUBMITTED",
          actorType: "LEARNER",
          actorUserId: "learner-1",
          previousScore: 5,
          newScore: 5,
        },
      },
    });
    const body = await response.json();
    expect(body.review.reference).toMatch(/^SBMR-\d{8}-[A-F0-9]{12}$/);
    expect(body.review.statusLabel).toBe("Pending review");
  });

  it("does not expose another learner's marked answer", async () => {
    prismaMocks.answerFindUnique.mockResolvedValueOnce({
      ...(await prismaMocks.answerFindUnique()),
      instance: {
        userId: "learner-2",
        graded: true,
        template: {
          title: "Paper",
          format: "WRITTEN",
          subject: { name: "Mathematics" },
        },
      },
    });
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/v1/mock-exams/marking-reviews", {
        method: "POST",
        body: JSON.stringify({
          answerId: "answer-1",
          reason: "Please review this particular marking decision.",
        }),
      })
    );
    expect(response).toBeDefined();
    if (!response) throw new Error("Expected a response");
    expect(response.status).toBe(404);
    expect(prismaMocks.reviewCreate).not.toHaveBeenCalled();
  });
});
