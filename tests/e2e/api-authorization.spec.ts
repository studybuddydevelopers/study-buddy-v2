import { PrismaClient } from "@prisma/client";
import { expect, test as base, type APIRequestContext } from "@playwright/test";
import { API_ROUTE_CONTRACTS } from "../api-route-contracts";
import fixtureUsers from "./support/fixture-users.json";

const origin = "http://127.0.0.1:3200";
const fixtureId = "88888888-8888-4888-8888-888888888888";
const { learner: E2E_USER, peer: E2E_PEER } = fixtureUsers;
const authMethods = API_ROUTE_CONTRACTS.filter(({ access }) =>
  ["session", "learner", "ai", "support"].includes(access)
);

type SessionState = Awaited<ReturnType<APIRequestContext["storageState"]>>;

const test = base.extend<{ peerRequest: APIRequestContext }, { peerSession: SessionState }>({
  peerSession: [async ({ playwright }, provide) => {
    const request = await playwright.request.newContext({ baseURL: origin });
    let session: SessionState;
    try {
      session = await signIn(request, E2E_PEER);
    } finally {
      await request.dispose();
    }
    await provide(session);
  }, { scope: "worker" }],
  peerRequest: async ({ playwright, peerSession }, provide) => {
    const request = await playwright.request.newContext({ baseURL: origin, storageState: peerSession });
    try {
      await provide(request);
    } finally {
      await request.dispose();
    }
  },
});

function samplePath(path: string) {
  return path === "/api/v1/mock-exams/instance"
    ? `${path}?instanceId=${fixtureId}`
    : path.replace(/\[[^\]]+\]/g, fixtureId);
}

async function signIn(request: APIRequestContext, user: { email: string; password: string }) {
  const response = await request.post("/api/v1/login", {
    headers: { Origin: origin },
    data: { identifier: user.email, password: user.password },
  });
  expect(response.status()).toBe(200);
  const session = await request.storageState();
  expect(session.cookies.some((cookie) =>
    /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name)
  )).toBe(true);
  return session;
}

async function call(request: APIRequestContext, method: string, path: string, data?: object) {
  return request.fetch(path, { method, data, headers: { Origin: origin }, maxRedirects: 0 });
}

test("session-protected methods deny anonymous requests", async ({ request }) => {
  for (const { method, path } of authMethods) {
    await test.step(`${method} ${path}`, async () => {
      const response = await call(request, method, samplePath(path), method === "GET" ? undefined : {});
      expect(response.status()).toBe(401);
    });
  }
});

test("learner, AI and support boundaries enforce account status and permissions", async ({ peerRequest: request }) => {
  const database = new PrismaClient({ datasourceUrl: process.env.E2E_DATABASE_URL });
  try {
    for (const { method, path } of authMethods.filter(({ access }) => access === "support")) {
      await test.step(`Learner denied ${method} ${path}`, async () => {
        const response = await call(request, method, samplePath(path), method === "GET" ? undefined : {});
        expect(response.status()).toBe(403);
        expect(await response.json()).toMatchObject({ error: "SUPPORT_ACCESS_REQUIRED" });
      });
    }

    await database.user.update({ where: { id: E2E_PEER.id }, data: {
      accountStatus: "GUARDIAN_AUTHORIZATION_REQUIRED", aiAccessAuthorized: false,
    } });
    for (const { method, path } of authMethods.filter(({ access }) => access !== "session")) {
      await test.step(`Restricted account denied ${method} ${path}`, async () => {
        const response = await call(request, method, samplePath(path), method === "GET" ? undefined : {});
        expect(response.status()).toBe(403);
        expect(await response.json()).toMatchObject({ error: "ACCOUNT_RESTRICTED" });
      });
    }
    const lifecycle = await request.get("/api/v1/account/lifecycle");
    expect(lifecycle.status()).toBe(200);
    expect(await lifecycle.json()).toMatchObject({ accountStatus: "GUARDIAN_AUTHORIZATION_REQUIRED" });

    await database.user.update({ where: { id: E2E_PEER.id }, data: { accountStatus: "ACTIVE" } });
    expect((await request.get("/api/v1/me")).status()).toBe(200);
    for (const { method, path } of authMethods.filter(({ access }) => access === "ai")) {
      await test.step(`Learner without AI permission denied ${method} ${path}`, async () => {
        const response = await call(request, method, samplePath(path), method === "GET" ? undefined : {});
        expect(response.status()).toBe(403);
        expect(await response.json()).toMatchObject({ error: "AI_AUTHORIZATION_REQUIRED" });
      });
    }
  } finally {
    try {
      await database.user.update({ where: { id: E2E_PEER.id }, data: {
        accountStatus: "ACTIVE", aiAccessAuthorized: true,
      } });
    } finally {
      await database.$disconnect();
    }
  }
});

test("browser mutations with a session cookie require a trusted origin", async ({ peerRequest: request }) => {
  const mutations = API_ROUTE_CONTRACTS.filter(({ path, method, access }) =>
    path.startsWith("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
    !["scheduled", "signed-callback", "disabled"].includes(access)
  );
  for (const { method, path } of mutations) {
    await test.step(`${method} ${path}`, async () => {
      const response = await request.fetch(samplePath(path), {
        method,
        data: {},
        headers: { Origin: "https://untrusted.example.test" },
      });
      expect(response.status()).toBe(403);
      expect(await response.json()).toMatchObject({ error: "CSRF_VALIDATION_FAILED" });
    });
  }
  const missing = await request.patch("/api/v1/profile", { data: {} });
  expect(missing.status()).toBe(403);
  expect(await missing.json()).toMatchObject({ error: "CSRF_VALIDATION_FAILED" });
});

test("input validation and Next.js method handling return the expected status", async ({ peerRequest: request }) => {
  const badProfile = await call(request, "PATCH", "/api/v1/profile", { firstName: 42 });
  expect(badProfile.status()).toBe(400);
  expect(await badProfile.json()).toMatchObject({ error: "INVALID_PROFILE" });
  expect((await request.get("/api/v1/notifications?limit=0")).status()).toBe(400);

  const oversized = await call(request, "PATCH", "/api/v1/notifications", { id: "a".repeat(4096), read: true });
  expect(oversized.status()).toBe(413);
  expect(await oversized.json()).toMatchObject({ error: "REQUEST_TOO_LARGE" });
  expect((await call(request, "PUT", "/api/v1/profile", {})).status()).toBe(405);
  expect((await request.head("/api/health")).status()).toBe(200);
  const options = await request.fetch("/api/v1/profile", { method: "OPTIONS" });
  expect(options.status()).toBe(204);
  expect(options.headers().allow.split(/,\s*/)).toEqual(expect.arrayContaining(["GET", "HEAD", "OPTIONS", "PATCH"]));
});

test("provider and scheduled endpoints do not accept a learner session as authorization", async ({ peerRequest: request }) => {
  const routes = API_ROUTE_CONTRACTS.filter(({ access }) =>
    ["scheduled", "signed-callback", "disabled", "retired"].includes(access)
  );
  for (const { method, path, access } of routes) {
    await test.step(`${method} ${path}`, async () => {
      const response = await call(request, method, path, method === "GET" ? undefined : {});
      const status = access === "disabled" ? 404 : access === "retired" ? 410 : 401;
      expect(response.status()).toBe(status);
    });
  }
});

test("learner-owned records cannot be read or modified by a second learner", async ({ peerRequest: request, playwright }) => {
  const owner = await playwright.request.newContext({ baseURL: origin });
  const database = new PrismaClient({ datasourceUrl: process.env.E2E_DATABASE_URL });
  try {
    await signIn(owner, E2E_USER);
    const chat = await database.aiChat.create({ data: { userId: E2E_USER.id, title: "Synthetic private chat" } });
    const message = await database.aiChatMessage.create({ data: {
      chatId: chat.id, role: "ASSISTANT", content: "Synthetic private answer",
    } });
    const report = await database.aiChatMessageReport.create({ data: {
      messageId: message.id, userId: E2E_USER.id, reason: "INCORRECT", details: "Synthetic report",
    } });
    expect((await owner.get(`/api/v1/ai/chats/${chat.id}`)).status()).toBe(200);
    expect((await request.get(`/api/v1/ai/chats/${chat.id}`)).status()).toBe(404);
    expect((await call(request, "DELETE", `/api/v1/ai/chats/${chat.id}`)).status()).toBe(404);
    expect((await owner.get(`/api/v1/ai/chats/${chat.id}`)).status()).toBe(200);

    const reportPath = `/api/v1/ai/chats/${chat.id}/messages/${message.id}/report`;
    const ownerReport = await owner.get(reportPath);
    expect(ownerReport.status()).toBe(200);
    expect(await ownerReport.json()).toMatchObject({ report: { id: report.id } });
    expect((await request.get(reportPath)).status()).toBe(404);

    const question = await database.pastQuestion.findFirstOrThrow({ where: { source: "synthetic-e2e" } });
    const template = await database.mockExamTemplate.create({ data: {
      subjectId: question.subjectId, title: "Synthetic written paper", questionCount: 1, format: "WRITTEN",
    } });
    const exam = await database.mockExamInstance.create({ data: {
      userId: E2E_USER.id, templateId: template.id, graded: true, submittedAt: new Date(),
    } });
    const answer = await database.mockExamAnswer.create({ data: {
      mockExamInstanceId: exam.id, pastQuestionId: question.id,
      userAnswer: "2", score: 1, aiExplanation: "Synthetic rationale",
    } });
    const examPath = `/api/v1/mock-exams/instance?instanceId=${exam.id}`;
    expect((await owner.get(examPath)).status()).toBe(200);
    expect((await request.get(examPath)).status()).toBe(403);

    const reviewPath = "/api/v1/mock-exams/marking-reviews";
    const reviewInput = { answerId: answer.id, reason: "Please check the marking for this step." };
    expect((await call(request, "POST", reviewPath, reviewInput)).status()).toBe(404);
    expect((await call(owner, "POST", reviewPath, reviewInput)).status()).toBe(201);
    const review = await database.mockExamMarkingReview.findUniqueOrThrow({ where: { mockExamAnswerId: answer.id } });
    expect(await (await owner.get(reviewPath)).json()).toMatchObject({ reviews: [{ id: review.id }] });
    expect(await (await request.get(reviewPath)).json()).toMatchObject({ reviews: [] });

    const notification = await database.notification.create({ data: { userId: E2E_USER.id, reviewId: review.id } });
    const read = { id: notification.id, read: true };
    expect((await call(request, "PATCH", "/api/v1/notifications", read)).status()).toBe(404);
    expect(await database.notification.findUnique({ where: { id: notification.id } })).toMatchObject({ readAt: null });
    expect((await call(owner, "PATCH", "/api/v1/notifications", read)).status()).toBe(200);

    const subscription = await database.subscription.findFirstOrThrow({ where: { userId: E2E_USER.id } });
    const subscriptionPath = `/api/v1/subscriptions/${subscription.id}/status`;
    expect((await owner.get(subscriptionPath)).status()).toBe(200);
    expect((await request.get(subscriptionPath)).status()).toBe(403);

    const update = await call(request, "PATCH", "/api/v1/profile", { firstName: "Updated Peer" });
    expect(update.status()).toBe(200);
    expect(await (await request.get("/api/v1/profile")).json()).toMatchObject({
      userId: E2E_PEER.id, profile: { firstName: "Updated Peer" },
    });
    expect(await (await owner.get("/api/v1/profile")).json()).toMatchObject({
      userId: E2E_USER.id, profile: { firstName: E2E_USER.firstName },
    });
  } finally {
    await Promise.all([owner.dispose(), database.$disconnect()]);
  }
});
