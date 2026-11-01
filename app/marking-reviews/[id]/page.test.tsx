import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findFirst: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { mockExamMarkingReview: { findFirst: mocks.findFirst } } }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock("@/components/ReadNotificationOnOpen", () => ({ default: () => null }));
import Page, { metadata } from "./page";

describe("private marking-review decision page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ dbUser: { id: "learner-1" } });
    mocks.findFirst.mockResolvedValue({
      reference: "SBMR-EXAMPLE", status: "MARK_ADJUSTED", originalScore: 3, revisedScore: 5, maxScore: 8,
      paperTitleSnapshot: "Maths Paper 2", subjectNameSnapshot: "Mathematics", questionReferenceSnapshot: "Q2",
      questionTextSnapshot: "Solve x + 2 = 4", learnerAnswerSnapshot: "x = 2", learnerReason: "Please check my working.",
      resolutionNote: "Two method marks were missing.", resolvedAt: new Date("2026-10-25T00:00:00Z"),
      mockExamInstanceId: "exam-1", mockExamAnswerId: "answer-2", notification: null,
    });
  });
  it("scopes the query to the account and links the precise answer, not just the paper", async () => {
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ id: "review-1" }) }));
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "review-1", userId: "learner-1" } }));
    expect(html).toContain('/exams/exam-1#answer-answer-2');
    expect(html).toContain("Two method marks were missing.");
    expect(html).toContain("Solve x + 2 = 4");
    expect(html).not.toContain("<main");
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
  it("returns not found for missing or other-account cases", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(Page({ params: Promise.resolve({ id: "someone-elses-case" }) })).rejects.toThrow("NOT_FOUND");
  });
  it("does not query review data when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ errorResponse: new Response(null, { status: 401 }) });
    await expect(Page({ params: Promise.resolve({ id: "review-1" }) })).rejects.toThrow("REDIRECT:/login");
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
  it("escapes learner and support text", async () => {
    const review = await mocks.findFirst();
    mocks.findFirst.mockResolvedValue({ ...review, resolutionNote: "<script>alert(1)</script>" });
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ id: "review-1" }) }));
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});
