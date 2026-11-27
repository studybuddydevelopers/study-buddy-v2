import { createHash, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import fixtureUsers from "./support/fixture-users.json";

const APP_ORIGIN = "http://127.0.0.1:3200";
const MAILBOX = "http://127.0.0.1:55431/outbox";
const PASSWORD = "Lifecycle-original-password-42!";
const NEW_PASSWORD = "Lifecycle-recovered-password-42!";
const CRON_SECRET = "e2e-account-deletion-cron-secret-only";

type Mail = { subject: string; link?: string; html?: string };

async function mail(request: APIRequestContext, to: string, subject: RegExp, count = 1) {
  let matching: Mail[] = [];
  await expect.poll(async () => {
    const response = await request.get(MAILBOX, { params: { to } });
    expect(response.ok()).toBe(true);
    const inbox = (await response.json()) as Mail[];
    matching = inbox.filter((message) => subject.test(message.subject));
    return matching.length;
  }).toBe(count);
  return matching[count - 1];
}

function emailLink(message: Mail, pathname: string) {
  const value = message.link ?? message.html?.match(/href="(http[^"\s]+)"/)?.[1];
  expect(value, `Email should include a link to ${pathname}`).toBeTruthy();
  const url = new URL(value!);
  expect(url.origin).toBe(APP_ORIGIN);
  expect(url.pathname).toBe(pathname);
  return url.href;
}

async function openEmail(page: Page, link: string) {
  await page.goto("about:blank");
  await page.goto(link);
}

function yearsAgo(years: number) {
  const today = new Date();
  const year = today.getUTCFullYear() - years;
  const month = today.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(today.getUTCDate(), lastDay)))
    .toISOString().slice(0, 10);
}

async function fillSignUp(page: Page, email: string, age: number, guardianEmail?: string) {
  await page.goto("/sign-up");
  await page.getByLabel("First Name").fill("Lifecycle");
  await page.getByLabel("Last Names").fill("Test Student");
  await page.getByLabel(/^Email/).fill(email);
  await page.getByLabel("Phone Number").fill("08000000000");
  await page.getByLabel("Date of Birth").fill(yearsAgo(age));
  if (guardianEmail) {
    await page.getByLabel("Parent or Legal Guardian Name").fill("Test Guardian");
    await page.getByLabel("Parent or Legal Guardian Email").fill(guardianEmail);
  }
  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByLabel("Confirm Password").fill(PASSWORD);
  await page.getByRole("checkbox", { name: /I have read and agree/ }).check();
}

async function signUp(page: Page, request: APIRequestContext, email: string, guardianEmail?: string) {
  await fillSignUp(page, email, guardianEmail ? 13 : 18, guardianEmail);
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(guardianEmail ? /\/guardian-authorization-pending/ : /\/verify-email\?email=/);
  return emailLink(await mail(request, email, /^Confirm your email$/), "/auth/confirm");
}

async function verifyEmail(page: Page, link: string) {
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Email verified" })).toBeVisible();
  expect((await page.request.get("/api/v1/me")).status()).toBe(401);
}

async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email or Phone Number").fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.locator("#main-content").getByRole("button", { name: "Log In" }).click();
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("banner").getByRole("button", { name: "Log In" })).toBeVisible();
}

async function getUserId(page: Page) {
  const response = await page.request.get("/api/v1/me");
  expect(response.status()).toBe(200);
  return (await response.json() as { id: string }).id;
}

async function withDatabase<T>(operation: (database: PrismaClient) => Promise<T>) {
  const database = new PrismaClient({ datasourceUrl: process.env.E2E_DATABASE_URL });
  try {
    return await operation(database);
  } finally {
    await database.$disconnect();
  }
}

test.beforeEach(async () => {
  // Independent auth journeys share the same loopback IP in the harness.
  await withDatabase((database) =>
    database.rateLimitBucket.deleteMany({
      where: { scope: { in: ["auth:signup:ip", "auth:login:ip"] } },
    })
  );
});

test("sign-up checks age, verifies email once and signs out across tabs", async ({ page, request, context }) => {
  await fillSignUp(page, "too-young@example.test", 12);
  await expect(page.getByText(/accounts are available from age 13/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Account" })).toBeDisabled();

  const email = "new-adult@example.test";
  const confirmation = await signUp(page, request, email);
  await login(page, email);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(/invalid|couldn't log you in/i);
  await verifyEmail(page, confirmation);
  await page.goto(confirmation);
  await expect(page).toHaveURL(/\/verify-email\?status=expired$/);
  await expect(page.getByRole("heading", { name: "Email Link Not Valid" })).toBeVisible();

  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
  const userId = await getUserId(page);
  const otherTab = await context.newPage();
  await otherTab.goto("/dashboard");
  await expect(otherTab).toHaveURL(/\/dashboard$/);
  await logout(page);
  await otherTab.reload();
  await expect(otherTab).toHaveURL(/\/unauthorized$/);

  await withDatabase((database) => database.user.update({
    where: { id: userId },
    data: { accountStatus: "AGE_VERIFICATION_REQUIRED", aiAccessAuthorized: false, profile: { update: { dateOfBirth: null } } },
  }));
  await login(page, email);
  await expect(page).toHaveURL(/\/age-verification$/);
  expect((await page.request.get("/api/v1/me")).status()).toBe(403);
  await page.getByLabel("Date of Birth").fill(yearsAgo(18));
  await page.getByRole("checkbox", { name: /I have read and agree/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await getUserId(page)).toBe(userId);
});

for (const approval of [true, false]) {
  test(`a guardian can ${approval ? "approve learning without AI" : "deny the account"}`, async ({ page, browser, request }) => {
    const variant = approval ? "approval" : "denial";
    const email = `student-${variant}@example.test`;
    const guardianEmail = `guardian-${variant}@example.test`;
    await verifyEmail(page, await signUp(page, request, email, guardianEmail));
    await login(page, email);
    await expect(page).toHaveURL(/\/guardian-authorization-pending$/);
    expect((await page.request.get("/api/v1/me")).status()).toBe(403);

    const guardian = await browser.newPage();
    try {
      let link = emailLink(await mail(request, guardianEmail, /^Approve /), "/guardian-authorization");
      if (approval) {
        const token = new URLSearchParams(new URL(link).hash.slice(1)).get("token");
        expect(token).toBeTruthy();
        await withDatabase((database) => database.guardianAuthorization.update({
          where: { tokenHash: createHash("sha256").update(token!).digest("hex") },
          data: { tokenExpiresAt: new Date(Date.now() - 60_000) },
        }));
        await openEmail(guardian, link);
        await expect(guardian.getByText(/invalid, expired, already decided/)).toBeVisible();
        const failure = await request.post(`${MAILBOX}/fail-next-delivery`, { data: { to: guardianEmail } });
        expect(failure.status()).toBe(204);
        const resend = page.getByRole("button", { name: "Resend approval email" });
        await resend.click();
        await expect(page.getByRole("main").getByRole("alert")).toContainText("We could not send the email");
        await expect(page.getByText(/A new approval link was sent/)).toHaveCount(0);
        await mail(request, guardianEmail, /^Approve /);
        await resend.click();
        await expect(page.getByText(/A new approval link was sent/)).toBeVisible();
        link = emailLink(await mail(request, guardianEmail, /^Approve /, 2), "/guardian-authorization");
      }

      await openEmail(guardian, link);
      await expect(guardian.getByText(/AI features, including written Paper 2 marking, are paused/)).toBeVisible();
      await expect(guardian.getByRole("checkbox")).toHaveCount(2);
      await guardian.getByRole("checkbox", { name: /I confirm I am this student/ }).check();
      await guardian.getByRole("checkbox", { name: /I reviewed/ }).check();
      await guardian.getByRole("button", { name: approval ? "Approve account" : "Deny request" }).click();
      await expect(guardian.getByText(/Your decision has been recorded/)).toBeVisible();
      await openEmail(guardian, link);
      await expect(guardian.getByText(/invalid, expired, already decided/)).toBeVisible();
    } finally {
      await guardian.close();
    }

    await page.goto("/dashboard");
    await expect(page).toHaveURL(approval ? /\/dashboard$/ : /\/guardian-authorization-pending$/);
    expect((await page.request.get("/api/v1/me")).status()).toBe(approval ? 200 : 403);
    const chat = await page.request.get("/api/v1/ai/chats");
    expect(chat.status()).toBe(403);
    expect(await chat.json()).toMatchObject({ error: approval ? "AI_AGE_RESTRICTED" : "ACCOUNT_RESTRICTED" });
    if (approval) {
      const learnerId = await getUserId(page);
      const updated = await withDatabase((database) => database.user.findUniqueOrThrow({
        where: { id: learnerId },
        select: { aiAccessAuthorized: true, guardianAuthorizations: {
          where: { status: "GRANTED" }, select: { aiAuthorized: true },
        } },
      }));
      expect(updated).toEqual({ aiAccessAuthorized: false, guardianAuthorizations: [{ aiAuthorized: false }] });
      await page.goto("/chat");
      await expect(page.getByText("AI features are currently paused for users under 18.")).toBeVisible();
      await expect(page.getByRole("textbox", { name: "Message to AI Study Buddy Tutor" })).toHaveCount(0);
      await page.getByRole("link", { name: "Browse practice materials" }).click();
      await expect(page).toHaveURL(/\/materials$/);
    }
  });
}

test("a verified guardian withdrawal revokes sessions, holds saved work and retries a failed notice", async ({ page, browser, request, playwright }) => {
  const studentEmail = "withdrawal-student@example.test";
  const guardianEmail = "withdrawal-guardian@example.test";
  await verifyEmail(page, await signUp(page, request, studentEmail, guardianEmail));

  const guardian = await browser.newPage();
  const operator = await playwright.request.newContext({ baseURL: APP_ORIGIN });
  const secondDevice = await playwright.request.newContext({ baseURL: APP_ORIGIN });
  try {
    const link = emailLink(await mail(request, guardianEmail, /^Approve /), "/guardian-authorization");
    await openEmail(guardian, link);
    await guardian.getByRole("checkbox", { name: /I confirm I am this student/ }).check();
    await guardian.getByRole("checkbox", { name: /I reviewed/ }).check();
    await guardian.getByRole("button", { name: "Approve account" }).click();
    await expect(guardian.getByText(/Your decision has been recorded/)).toBeVisible();

    await login(page, studentEmail);
    await expect(page).toHaveURL(/\/dashboard$/);
    const studentId = await getUserId(page);
    const signIn = (client: APIRequestContext, identifier: string, password: string) =>
      client.post("/api/v1/login", { headers: { Origin: APP_ORIGIN }, data: { identifier, password } });
    expect((await signIn(secondDevice, studentEmail, PASSWORD)).status()).toBe(200);
    expect((await secondDevice.get("/api/v1/me")).status()).toBe(200);
    expect((await signIn(operator, fixtureUsers.learner.email, fixtureUsers.learner.password)).status()).toBe(200);

    const otherUserId = fixtureUsers.peer.id;
    const grant = await withDatabase(async (database) => {
      for (const userId of [studentId, studentId, otherUserId]) {
        const sessionId = randomUUID();
        await database.$executeRaw`INSERT INTO auth.sessions VALUES (${sessionId}::uuid, ${userId}::uuid)`;
        await database.$executeRaw`INSERT INTO auth.refresh_tokens (user_id, session_id) VALUES (${userId}, ${sessionId}::uuid)`;
      }
      await database.$executeRaw`INSERT INTO auth.refresh_tokens (user_id) VALUES (${studentId})`;
      await database.aiChat.create({ data: { userId: studentId, title: "Earlier saved study chat" } });
      return database.guardianAuthorization.findFirstOrThrow({ where: { studentUserId: studentId, status: "GRANTED" } });
    });
    const payload = { authorizationId: grant.id, caseReference: "synthetic-case-001", verified: true };
    const withdraw = (client: APIRequestContext, data = payload) =>
      client.post("/api/v1/support/guardian-withdrawals", { headers: { Origin: APP_ORIGIN }, data });

    expect((await withdraw(page.request)).status()).toBe(403);
    expect((await withdraw(operator, { ...payload, verified: false })).status()).toBe(400);
    expect((await request.post(`${MAILBOX}/fail-next-delivery`, { data: { to: guardianEmail } })).status()).toBe(204);

    const first = await withdraw(operator);
    expect(first.status()).toBe(200);
    expect(await first.json()).toEqual({ restricted: true, studentNotified: true, guardianNotified: false });
    expect((await page.request.get("/api/v1/me")).status()).toBe(403);
    expect((await secondDevice.get("/api/v1/me")).status()).toBe(403);
    const attemptedSignIn = await signIn(secondDevice, studentEmail, PASSWORD);
    expect(attemptedSignIn.headers()["x-study-buddy-next"]).toBe("/guardian-authorization-withdrawn");
    expect((await secondDevice.get("/api/v1/me")).status()).toBe(401);

    expect((await withdraw(operator, { ...payload, caseReference: "different-case-02" })).status()).toBe(409);
    expect(await (await withdraw(operator)).json()).toEqual({ restricted: true, studentNotified: true, guardianNotified: true });
    expect(await (await withdraw(operator)).json()).toEqual({ restricted: true, studentNotified: true, guardianNotified: true });
    await mail(request, studentEmail, /^Guardian authorisation withdrawn/);
    await mail(request, guardianEmail, /^Guardian authorisation withdrawn/);

    await withDatabase(async (database) => {
      const account = await database.user.findUniqueOrThrow({ where: { id: studentId } });
      expect(account).toMatchObject({ accountStatus: "GUARDIAN_AUTHORIZATION_WITHDRAWN", aiAccessAuthorized: false });
      expect(await database.aiChat.count({ where: { userId: studentId } })).toBe(1);
      expect(await database.guardianAuthorizationEvent.findMany({ where: { authorizationId: grant.id, eventType: "WITHDRAWN" } }))
        .toEqual([expect.objectContaining({ actorType: "PRIVACY_OPERATOR", details: { caseReference: payload.caseReference, operatorUserId: fixtureUsers.learner.id } })]);
      expect(await database.$queryRaw`SELECT user_id::text FROM auth.sessions WHERE user_id IN (${studentId}::uuid, ${otherUserId}::uuid)`).toEqual([{ user_id: otherUserId }]);
      expect(await database.$queryRaw`SELECT user_id FROM auth.refresh_tokens WHERE user_id IN (${studentId}, ${otherUserId})`).toEqual([{ user_id: otherUserId }]);
    });
  } finally {
    await Promise.all([guardian.close(), operator.dispose(), secondDevice.dispose()]);
  }
});

test("password-reset warnings require confirmation and a locked account can recover", async ({ page, request }) => {
  const email = "reset-student@example.test";
  await verifyEmail(page, await signUp(page, request, email));

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    const submitted = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/reset-password");
    await page.getByRole("button", { name: "Submit" }).click();
    expect((await submitted).status()).toBe(attempt <= 3 ? 200 : 429);
    if (attempt <= 3) await expect(page).toHaveURL(/\/check-email$/);
  }
  await expect(page.getByText(/Too many password reset requests/)).toBeVisible();
  const warningLink = emailLink(await mail(request, email, /^Several password-reset requests/), "/account-security/password-reset-alert");
  await page.goto(warningLink);
  await expect(page.getByRole("heading", { name: "Was this password reset you?" })).toBeVisible();
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
  await logout(page);

  await page.goto(warningLink);
  await page.getByRole("button", { name: "Secure and lock account" }).click();
  await expect(page.getByRole("heading", { name: "Your account has been secured" })).toBeVisible();
  await login(page, email);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(/invalid|couldn't log you in/i);

  const recoveryLink = emailLink(await mail(request, email, /temporarily locked$/), "/account-security/password-reset-recovery");
  await page.goto(recoveryLink);
  await expect(page.getByRole("heading", { name: "Recover your locked account" })).toBeVisible();
  await page.getByRole("button", { name: "Start secure recovery" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  const resetLink = emailLink(await mail(request, email, /^Reset your password$/, 4), "/auth/password-reset");
  await page.goto(resetLink);
  await page.getByLabel("New Password").fill(NEW_PASSWORD);
  await page.getByLabel("Confirm Password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Update Password" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await logout(page);

  await page.goto(resetLink);
  await page.getByLabel("New Password").fill(PASSWORD);
  await page.getByLabel("Confirm Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Update Password" }).click();
  await expect(page.getByText(/Email link is invalid or has expired/)).toBeVisible();
  await login(page, email, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test("deactivation, deletion cancellation and due deletion preserve the expected account state", async ({ page, request }) => {
  const email = "lifecycle-student@example.test";
  await verifyEmail(page, await signUp(page, request, email));
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);
  const userId = await getUserId(page);
  await page.goto("/settings/account");
  await page.getByRole("button", { name: "Deactivate account", exact: true }).click();
  await page.getByRole("button", { name: "Confirm deactivation" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, email);
  await expect(page).toHaveURL(/\/account-deactivated$/);
  expect((await page.request.get("/api/v1/me")).status()).toBe(403);
  await page.getByRole("button", { name: "Reactivate account" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);

  async function requestDeletion() {
    await page.goto("/settings/account");
    await page.getByRole("button", { name: "Delete account permanently" }).click();
    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page.getByRole("button", { name: "Request permanent deletion" }).click();
  }

  const failure = await request.post(`${MAILBOX}/fail-next-delivery`, { data: { to: email } });
  expect(failure.status()).toBe(204);
  await requestDeletion();
  await expect(page.getByText(/confirmation email could not be sent/i)).toBeVisible();
  expect(await getUserId(page)).toBe(userId);

  for (const cancel of [true, false]) {
    await requestDeletion();
    await expect(page.getByText(/Check your account email for the one-time deletion/)).toBeVisible();
    const link = emailLink(await mail(request, email, /^Confirm deletion/, cancel ? 1 : 2), "/account-deletion/confirm");
    await page.goto(link);
    const confirm = page.getByRole("button", { name: "Confirm permanent deletion" });
    await expect(confirm).toBeEnabled();
    expect(await getUserId(page)).toBe(userId);
    if (cancel) {
      const finalEmailFailure = await request.post(`${MAILBOX}/fail-next-delivery`, { data: { to: email } });
      expect(finalEmailFailure.status()).toBe(204);
    }
    await confirm.click();
    await expect(page.getByText("Account access is now restricted")).toBeVisible();

    if (cancel) {
      await expect(page.getByText("The final email could not be sent")).toBeVisible();
      const outbox = await request.get(MAILBOX, { params: { to: email } });
      expect(outbox.ok()).toBe(true);
      const delivered = (await outbox.json()) as Mail[];
      expect(delivered.some((message) => /pending deletion$/.test(message.subject))).toBe(false);
      await openEmail(page, link);
      await confirm.click();
      await expect(page.getByText(/invalid, expired, or already used/)).toBeVisible();
      await login(page, email);
      await expect(page).toHaveURL(/\/account-deletion-pending$/);
      expect((await page.request.get("/api/v1/me")).status()).toBe(403);
      await page.getByRole("button", { name: "Cancel deletion request" }).click();
      await expect(page).toHaveURL(/\/login$/);
      await login(page, email);
      await expect(page).toHaveURL(/\/dashboard$/);
      expect(await getUserId(page)).toBe(userId);
    } else {
      await mail(request, email, /pending deletion$/);
    }
  }

  async function runCron() {
    const response = await request.post("/api/v1/account/deletion/cron", { headers: { "x-cron-secret": CRON_SECRET } });
    expect(response.status()).toBe(200);
    return (await response.json()).deletions;
  }

  expect(await runCron()).toMatchObject({ completed: 0, failed: 0 });
  const due = await withDatabase((database) => database.accountDeletionRequest.update({
    where: { userId },
    data: { scheduledFor: new Date(Date.now() - 2 * 24 * 60 * 60_000) },
  }));
  const authFailure = await request.post(`${MAILBOX}/fail-next-auth-deletion`, { data: { to: email } });
  expect(authFailure.status()).toBe(204);
  expect(await runCron()).toMatchObject({ completed: 0, failed: 1 });
  await withDatabase(async (database) => {
    expect(await database.user.findUnique({ where: { id: userId } })).toBeNull();
    expect(await database.accountDeletionRequest.findUnique({ where: { id: due.id } })).toMatchObject({
      status: "FAILED", authUserId: userId, lastFailureCode: "AUTH_DELETE_FAILED", attemptCount: 1,
    });
  });
  const retriedRuns = await Promise.all([runCron(), runCron()]);
  expect(retriedRuns.map((result) => result.completed).sort()).toEqual([0, 1]);
  expect(retriedRuns.every((result) => result.failed === 0)).toBe(true);
  expect(await runCron()).toMatchObject({ completed: 0, failed: 0 });
  await withDatabase(async (database) => {
    expect(await database.user.findUnique({ where: { id: userId } })).toBeNull();
    expect(await database.accountDeletionRequest.findUnique({ where: { id: due.id } })).toMatchObject({
      status: "COMPLETED", userId: null, authUserId: null, attemptCount: 2,
    });
  });
  await login(page, email);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(/invalid|couldn't log you in/i);
});
