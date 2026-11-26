import { expect, test, type APIRequestContext } from "@playwright/test";
import fixtureUsers from "./support/fixture-users.json";

const origin = "http://127.0.0.1:3200";
const outbox = "http://127.0.0.1:55431/outbox";
const recipient = fixtureUsers.learner.email;

async function inbox(request: APIRequestContext, email: string) {
  const response = await request.get(outbox, { params: { to: email } });
  expect(response.ok()).toBe(true);
  return (await response.json()) as { subject: string; link: string; pkceS256?: boolean }[];
}

test("password recovery handles provider throttling privately and delivers a canonical link on retry", async ({ page, request }) => {
  const throttle = await request.post(`${outbox}/throttle-next-recovery`, { data: { to: recipient } });
  expect(throttle.status()).toBe(204);

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(recipient);
  const firstResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/v1/reset-password"
  );
  await page.getByRole("button", { name: "Submit" }).click();
  const throttled = await firstResponse;
  expect(throttled.status()).toBe(200);
  expect(await throttled.json()).toEqual({ ok: true });
  await expect(page.getByText("Password reset requested.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/check-email$/);
  await expect(page.getByText(/If there’s an account for that email and we can process the request/)).toBeVisible();
  expect(await inbox(request, recipient)).toEqual([]);

  const missing = "missing-recovery-user@example.test";
  const reset = (email: string) => request.post("/api/v1/reset-password", {
    headers: { Origin: origin }, data: { email },
  });
  const absent = await reset(missing);
  expect(absent.status()).toBe(200);
  expect(await absent.json()).toEqual({ ok: true });
  expect(await inbox(request, missing)).toEqual([]);

  const retried = await reset(` ${recipient.toUpperCase()} `);
  expect(retried.status()).toBe(200);
  expect(await retried.json()).toEqual({ ok: true });
  const delivered = await inbox(request, recipient);
  expect(delivered).toHaveLength(1);
  expect(delivered[0]).toMatchObject({ subject: "Reset your password", pkceS256: true });
  const link = new URL(delivered[0].link);
  expect(link.origin).toBe(origin);
  expect(link.pathname).toBe("/auth/password-reset");
  expect(link.searchParams.get("token_hash")).toBeTruthy();
  expect(link.searchParams.get("type")).toBe("recovery");
  const redirect = await request.get(link.href, { maxRedirects: 0 });
  expect(redirect.status()).toBe(307);
  const target = new URL(redirect.headers().location);
  expect(target.origin).toBe(origin);
  expect(target.pathname).toBe("/reset-password/update");
  expect(target.search).toBe(link.search);
});
