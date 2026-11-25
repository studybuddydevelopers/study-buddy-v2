import { expect, test } from "@playwright/test";
import fixtureUsers from "./support/fixture-users.json";

const { email: E2E_EMAIL, password: E2E_PASSWORD } = fixtureUsers.learner;

test("an anonymous visitor is redirected and public routing stays healthy", async ({
  page,
  request,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/unauthorized$/);
  await expect(page.getByRole("heading")).toBeVisible();

  const healthResponse = await request.get("/api/health");
  expect(healthResponse.status()).toBe(200);
  await expect(healthResponse.json()).resolves.toEqual({ status: "ok" });

  const assetResponse = await request.get("/logo-icon.svg");
  expect(assetResponse.status()).toBe(200);
  expect(assetResponse.headers()["content-type"]).toContain("image/svg+xml");

  const protectedApiResponse = await request.get("/api/v1/me");
  expect(protectedApiResponse.status()).toBe(401);
  expect(pageErrors).toEqual([]);
});

test("a synthetic user logs in and reads database-backed dashboard data", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/login");
  await page.getByLabel("Email or Phone Number").fill(E2E_EMAIL);
  await page.getByLabel(/^Password/).fill(E2E_PASSWORD);
  await page
    .locator("#main-content")
    .getByRole("button", { name: "Log In" })
    .click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back, E2E" })
  ).toBeVisible();

  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name.startsWith("sb-"))).toBe(true);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome back, E2E" })
  ).toBeVisible();

  const meResponse = await page.evaluate(async () => {
    const response = await fetch("/api/v1/me");
    return { status: response.status, body: await response.json() };
  });
  expect(meResponse.status).toBe(200);
  expect(meResponse.body.profile).toMatchObject({
    firstName: "E2E",
    lastNames: "Student",
    gradeLevel: "SS3",
  });

  const statsResponse = await page.evaluate(async () => {
    const response = await fetch("/api/v1/dashboard/stats");
    return { status: response.status, body: await response.json() };
  });
  expect(statsResponse.status).toBe(200);
  expect(statsResponse.body.todaySummary.questionsAttempted).toBe(1);
  expect(pageErrors).toEqual([]);
});
