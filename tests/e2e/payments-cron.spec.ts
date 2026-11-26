import { createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import fixtureUsers from "./support/fixture-users.json";

const origin = "http://127.0.0.1:3200";
const mailbox = "http://127.0.0.1:55431/outbox";
const { learner, peer } = fixtureUsers;

test("Paystack records a successful charge once across webhook and checkout verification", async ({ request }) => {
  const database = new PrismaClient({ datasourceUrl: process.env.E2E_DATABASE_URL });
  const reference = "synthetic-paystack-overlap";
  const amount = 2_500;
  function deliver(event: string, status: string, validSignature = true, chargeAmount = amount) {
    const data = JSON.stringify({ event, data: {
      reference, amount: chargeAmount, currency: "NGN", status, metadata: { userId: learner.id },
    } }, null, 2);
    const signature = createHmac("sha512", "e2e-fake-paystack").update(data).digest("hex");
    return request.post("/api/v1/payments/webhook", { data, headers: {
      "Content-Type": "application/json", "x-paystack-signature": validSignature ? signature : "0".repeat(128),
    } });
  }
  try {
    expect((await deliver("charge.success", "success", false)).status()).toBe(401);
    expect((await deliver("refund.pending", "pending")).status()).toBe(200);
    expect((await deliver("charge.success", "success", true, 0)).status()).toBe(200);
    expect(await database.transaction.findUnique({ where: { reference } })).toBeNull();

    const login = await request.post("/api/v1/login", {
      headers: { Origin: origin }, data: { identifier: learner.email, password: learner.password },
    });
    expect(login.status()).toBe(200);
    const verify = (reference: string) => request.post("/api/v1/payments/verify", {
      headers: { Origin: origin }, data: { reference },
    });
    expect((await verify("synthetic-paystack-peer")).status()).toBe(403);
    expect((await verify("synthetic-paystack-unavailable")).status()).toBe(503);

    const subscriptionsBefore = await database.subscription.count({ where: { userId: learner.id } });
    const [firstWebhook, checkout, repeatedWebhook] = await Promise.all([
      deliver("charge.success", "success"), verify(reference), deliver("charge.success", "success"),
    ]);
    expect([firstWebhook.status(), checkout.status(), repeatedWebhook.status()]).toEqual([200, 200, 200]);
    const payment = { userId: learner.id, reference, amount: 25, currency: "NGN", status: "success" };
    expect(await checkout.json()).toMatchObject({ provider: "paystack", verified: true, transaction: payment });
    expect((await deliver("refund.pending", "pending")).status()).toBe(200);
    expect(await (await verify(reference)).json()).toMatchObject({ duplicate: true, transaction: payment });
    expect(await database.transaction.findMany({ where: { reference } })).toMatchObject([payment]);

    const legacyReference = "synthetic-paystack-legacy";
    await database.transaction.create({ data: { ...payment, reference: legacyReference, status: "pending" } });
    expect((await verify(legacyReference)).status()).toBe(409);
    expect(await database.subscription.count({ where: { userId: learner.id } })).toBe(subscriptionsBefore);
  } finally {
    await database.$disconnect();
  }
});

test("recommendations catch up after a missed run and skip existing recent results", async ({ request }) => {
  const database = new PrismaClient({ datasourceUrl: process.env.E2E_DATABASE_URL });
  const run = async () => {
    const response = await request.post("/api/v1/ai/recommendations/cron", {
      headers: { "x-cron-secret": "e2e-recommendations-cron-secret-only" },
    });
    expect(response.status()).toBe(200);
    return response.json();
  };
  try {
    const minorBirthDate = new Date(Date.UTC(new Date().getUTCFullYear() - 15, 0, 1));
    await database.userProfile.update({
      where: { userId: peer.id }, data: { dateOfBirth: minorBirthDate },
    });
    await database.recommendation.create({ data: {
      userId: learner.id, recommendationText: "Synthetic recommendation from a prior run",
      createdAt: new Date(Date.now() - 48 * 60 * 60_000),
    } });
    const caughtUp = await run();
    expect(caughtUp.created).toContain(learner.id);
    expect(caughtUp.skipped).toContain(peer.id);
    expect(await database.recommendation.count({ where: { userId: peer.id } })).toBe(0);
    expect(caughtUp.errorCount).toBe(0);
    const repeated = await run();
    expect(repeated.skipped).toContain(learner.id);
    expect(repeated.createdCount).toBe(0);
    expect(await database.recommendation.count({ where: { userId: learner.id } })).toBe(2);
  } finally {
    try {
      await database.userProfile.update({
        where: { userId: peer.id }, data: { dateOfBirth: new Date("2000-01-01T00:00:00.000Z") },
      });
    } finally {
      await database.$disconnect();
    }
  }
});

test("a retention job catches up to the current notice, retries delivery and skips the repeat", async ({ request }) => {
  const database = new PrismaClient({ datasourceUrl: process.env.E2E_DATABASE_URL });
  const run = async () => {
    const response = await request.post("/api/v1/account/deletion/cron", {
      headers: { "x-cron-secret": "e2e-account-deletion-cron-secret-only" },
    });
    expect(response.status()).toBe(200);
    return (await response.json()).inactiveAccounts;
  };
  const now = Date.now();
  try {
    await database.user.update({ where: { id: peer.id }, data: {
      accountStatus: "DEACTIVATED", deactivatedAt: new Date(now - 1_000),
      inactiveDeletionAt: new Date(now + 15 * 24 * 60 * 60_000 - 60_000),
    } });
    const fail = await request.post(`${mailbox}/fail-next-delivery`, { data: { to: peer.email } });
    expect(fail.status()).toBe(204);
    expect(await run()).toMatchObject({ warningsSent: 0, warningsFailed: 1 });
    expect(await database.user.findUnique({ where: { id: peer.id } })).toMatchObject({ inactiveWarning15SentAt: null });
    expect(await run()).toMatchObject({ warningsSent: 1, warningsFailed: 0 });
    expect(await run()).toMatchObject({ examined: 0, warningsSent: 0, warningsFailed: 0 });
    expect(await database.user.findUnique({ where: { id: peer.id } })).toMatchObject({
      inactiveWarning15SentAt: expect.any(Date), inactiveWarning90SentAt: null, inactiveWarning60SentAt: null,
    });
    const delivered = await request.get(mailbox, { params: { to: peer.email } });
    expect(delivered.status()).toBe(200);
    expect(await delivered.json()).toMatchObject([{ subject: "Your Study Buddy account will be deleted in 15 days" }]);
  } finally {
    try {
      await database.user.update({ where: { id: peer.id }, data: {
        accountStatus: "ACTIVE", deactivatedAt: null, inactiveDeletionAt: null, inactiveWarning15SentAt: null,
      } });
    } finally {
      await database.$disconnect();
    }
  }
});
