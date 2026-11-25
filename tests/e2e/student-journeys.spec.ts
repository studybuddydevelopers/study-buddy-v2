import { PrismaClient } from "@prisma/client";
import { expect, test as base, type APIRequestContext } from "@playwright/test";
import fixtureUsers from "./support/fixture-users.json";

const origin = "http://127.0.0.1:3200";
const { learner, peer } = fixtureUsers;
const practiceTopic = "Synthetic E2E Algebra";
const objectiveTemplate = "WAEC Mathematics – Quick Practice";
type Session = Awaited<ReturnType<APIRequestContext["storageState"]>>;

async function signIn(request: APIRequestContext, email: string, password: string) {
  const response = await request.post("/api/v1/login", {
    headers: { Origin: origin },
    data: { identifier: email, password },
  });
  expect(response.status()).toBe(200);
  return request.storageState();
}

const test = base.extend<object, { learnerSession: Session; database: PrismaClient }>({
  learnerSession: [async ({ playwright }, provide) => {
    const request = await playwright.request.newContext({ baseURL: origin });
    try {
      await provide(await signIn(request, learner.email, learner.password));
    } finally {
      await request.dispose();
    }
  }, { scope: "worker" }],
  storageState: async ({ learnerSession }, provide) => {
    await provide(learnerSession);
  },
  database: [async ({}, provide) => {
    const database = new PrismaClient({ datasourceUrl: process.env.E2E_DATABASE_URL });
    try {
      await provide(database);
    } finally {
      await database.$disconnect();
    }
  }, { scope: "worker" }],
});

test("practice saves a draft, records the answer and updates progress", async ({ page, database }) => {
  await page.goto("/materials");
  await page.getByRole("link", { name: /^Practice Questions by Topic/ }).click();
  await page.getByRole("link", { name: new RegExp(practiceTopic) }).click();
  const answer = page.getByRole("textbox", { name: "Your answer to question 1" });
  await answer.fill("2");
  await expect(page.getByText("Draft saved locally.", { exact: false })).toBeVisible();
  await page.reload();
  await expect(answer).toHaveValue("2");

  await page.getByRole("button", { name: "Submit answer", exact: true }).click();
  await expect(page.getByText("Correct.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit answer", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Show answer & explanation" }).click();
  await expect(page.getByText("One item plus one item makes two items.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Finish quiz" }).click();
  await expect(page.getByText("Quiz complete", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Review answers" }).click();
  await expect(page.getByText("What is 1 + 1?", { exact: true })).toBeVisible();

  expect(await database.practiceQuizSession.findFirst({
    where: { userId: learner.id, topic: { title: practiceTopic } },
    include: { answers: true },
  })).toMatchObject({ answers: [{ answerText: "2", isCorrect: true }] });
  await page.goto("/progress");
  await expect(page.getByText("2 correct from 2 submitted answers", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("2 correct from 2 submitted answers", { exact: true })).toBeVisible();
});

test("an objective mock resumes saved answers and keeps its grade after duplicate submission", async ({ page, database }) => {
  const subject = await database.subject.findFirstOrThrow({ where: { examCode: "WAEC-MATH" } });
  const template = await database.mockExamTemplate.create({ data: {
    subjectId: subject.id, title: objectiveTemplate, questionCount: 1, durationMinutes: 18, totalMarks: 1,
  } });
  await page.goto("/exams");
  await page.getByRole("link", { name: /^Quick Practice/ }).click();
  await page.getByRole("button", { name: "Start practice" }).click();
  await expect(page).toHaveURL(/\/exams\/[\w-]+$/);
  const examUrl = page.url();
  const correctChoice = page.getByRole("radiogroup", { name: "Question 1" }).getByRole("radio", { name: /^[A-D]\.\s*2$/ });
  await correctChoice.check();
  await page.getByRole("button", { name: "Save now" }).click();
  await expect(page.getByText(/^Saved at /)).toBeVisible();
  const instance = await database.mockExamInstance.findFirstOrThrow({
    where: { userId: learner.id, templateId: template.id }, include: { answers: true },
  });
  expect(instance.answers[0].userAnswer).toBe("2");
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Resume mock exam" }).click();
  await expect(page).toHaveURL(examUrl);
  await expect(correctChoice).toBeChecked();

  await page.getByRole("button", { name: "Submit & Grade" }).click();
  await expect(page.getByText("Scored 1 / 1", { exact: true })).toBeVisible();
  const duplicate = await page.request.post("/api/v1/mock-exams/submit", {
    headers: { Origin: origin },
    data: { instanceId: instance.id, answers: [{ answerId: instance.answers[0].id, userAnswer: "3" }] },
  });
  expect(duplicate.status()).toBe(400);
  expect(await duplicate.json()).toMatchObject({ error: "Exam already submitted" });
  await page.reload();
  await expect(page.getByText("Correct", { exact: true })).toBeVisible();
  expect(await database.mockExamInstance.findUnique({ where: { id: instance.id }, include: { answers: true } }))
    .toMatchObject({ graded: true, totalScore: 1, answers: [{ userAnswer: "2", score: 1 }] });
});

test("a saved chat can be found and reopened, retried and reported", async ({ page, database }) => {
  const question = "Can you help me understand an algebra equation?";
  const savedTitle = "Synthetic student journey algebra";
  await page.goto("/chat");
  await page.getByRole("button", { name: "New chat", exact: true }).click();
  const composer = page.getByRole("textbox", { name: "Message to AI Study Buddy Tutor" });
  const send = page.getByRole("button", { name: "Send message" });
  await composer.fill(question);
  await send.click();
  const transcript = page.getByRole("region", { name: "Chat messages" });
  await expect(transcript.getByText("Fake tutor response.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Chat settings", exact: true }).click();
  await page.getByRole("textbox", { name: "Chat title" }).fill(savedTitle);
  await page.getByRole("button", { name: "Save chat title" }).click();
  await expect(page.getByRole("button", { name: savedTitle, exact: true })).toBeVisible();

  const chat = await database.aiChat.findFirstOrThrow({ where: { userId: learner.id, title: savedTitle } });
  const failedQuestion = "Please explain how to check my solution.";
  const simulateFailure = await page.request.post("http://127.0.0.1:55431/openai/fail-next-completion", {
    data: { prompt: failedQuestion },
  });
  expect(simulateFailure.status()).toBe(204);
  await composer.fill(failedQuestion);
  await send.click();
  await expect(transcript.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  const failedRequest = await database.aiGenerationRequest.findFirstOrThrow({
    where: { chatId: chat.id, status: "FAILED", userMessage: { content: failedQuestion } },
  });

  await page.reload();
  await page.getByRole("button", { name: "Search chats" }).click();
  const search = page.getByRole("dialog", { name: "Search chats" });
  await search.getByRole("searchbox", { name: "Search chat titles" }).fill(savedTitle);
  await search.getByRole("button", { name: savedTitle, exact: true }).click();
  await expect(transcript.getByText(question, { exact: true })).toBeVisible();
  await expect(transcript.getByText(failedQuestion, { exact: true })).toBeVisible();
  await transcript.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(transcript.getByText("Fake tutor response.", { exact: true })).toHaveCount(2);
  await expect(transcript.getByText(failedQuestion, { exact: true })).toHaveCount(1);
  expect(await database.aiGenerationRequest.findUnique({ where: { id: failedRequest.id } }))
    .toMatchObject({ status: "COMPLETED", attemptCount: 2, userMessageId: failedRequest.userMessageId });

  const reportButton = transcript.getByRole("button", { name: "Report response" }).last();
  await reportButton.click();
  const report = page.getByRole("dialog", { name: "Report this response" });
  const details = "Synthetic report: please check the explanation.";
  const reportDetails = report.getByLabel("Anything else? (optional)");
  await reportDetails.fill(details);
  await page.route("**/messages/*/report", (route) => route.abort(), { times: 1 });
  await report.getByRole("button", { name: "Send report" }).click();
  await expect(report.getByRole("alert")).toContainText("We couldn't send your report");
  await expect(reportDetails).toHaveValue(details);
  await report.getByRole("button", { name: "Send report" }).click();
  await expect(report.getByRole("status")).toContainText("Report received");
  await report.getByRole("button", { name: "Done" }).click();
  await reportButton.click();
  await expect(report.getByRole("status")).toContainText("Report received");
  expect(await database.aiChatMessageReport.findUnique({ where: { messageId: failedRequest.assistantMessageId } }))
    .toMatchObject({ userId: learner.id, details });
});

test("a marking review becomes a notification and its decision stays private", async ({ page, database, browser, playwright }) => {
  const question = await database.pastQuestion.findFirstOrThrow({ where: { source: "synthetic-e2e" } });
  const template = await database.mockExamTemplate.create({ data: {
    subjectId: question.subjectId, title: "Synthetic written assessment", questionCount: 1, format: "WRITTEN", totalMarks: 8,
  } });
  const exam = await database.mockExamInstance.create({ data: {
    userId: learner.id, templateId: template.id, graded: true, submittedAt: new Date(), totalScore: 2,
    answers: { create: {
      pastQuestionId: question.id, userAnswer: "Two", score: 2, aiExplanation: "Synthetic rationale",
      section: "PART_I", maxScore: 8, displayOrder: 1,
    } },
  }, include: { answers: true } });

  await page.goto(`/exams/${exam.id}`);
  await page.getByRole("button", { name: "Report this marking for review" }).click();
  const reason = "Please review whether my answer earned another mark.";
  await page.getByLabel("Why should this mark be reviewed?").fill(reason);
  await page.getByRole("button", { name: "Create review case" }).click();
  await expect(page.getByText("Pending review", { exact: true })).toBeVisible();
  const review = await database.mockExamMarkingReview.findUniqueOrThrow({ where: { mockExamAnswerId: exam.answers[0].id } });
  expect(review).toMatchObject({ learnerReason: reason, status: "PENDING" });
  await page.getByRole("link", { name: "View all marking reviews" }).click();
  await expect(page.getByText(review.reference, { exact: false })).toBeVisible();

  // Supply a resolved case at the boundary of the learner notification workflow.
  const decision = "Synthetic support decision: the original mark was confirmed.";
  const resolved = await database.mockExamMarkingReview.update({ where: { id: review.id }, data: {
    status: "UPHELD", resolvedAt: new Date(), resolutionNote: decision,
    notification: { create: { userId: learner.id } },
  }, include: { notification: true } });
  await page.goto("/notifications");
  await page.getByRole("link", { name: `View decision for ${review.reference}` }).click();
  await expect(page.getByText(decision, { exact: true })).toBeVisible();
  await expect.poll(async () => (await database.notification.findUnique({
    where: { id: resolved.notification!.id },
  }))?.readAt ?? null).not.toBeNull();
  await page.getByRole("link", { name: "Back to notifications" }).click();
  const notification = page.getByRole("listitem").filter({ hasText: review.reference });
  await expect(notification.getByRole("button", { name: /^Mark as unread/ })).toBeVisible();

  const peerRequest = await playwright.request.newContext({ baseURL: origin });
  try {
    const session = await signIn(peerRequest, peer.email, peer.password);
    const peerContext = await browser.newContext({ storageState: session });
    try {
      const peerPage = await peerContext.newPage();
      await peerPage.goto(`${origin}/marking-reviews/${review.id}`);
      await expect(peerPage.getByText(decision, { exact: true })).toHaveCount(0);
      await expect(peerPage.getByRole("heading", { name: /not found/i })).toBeVisible();
    } finally {
      await peerContext.close();
    }
  } finally {
    await peerRequest.dispose();
  }
});
