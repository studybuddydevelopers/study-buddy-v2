import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchWithTimeout: vi.fn(),
}));

vi.mock("@/lib/security/timeouts", () => ({
  fetchWithTimeout: mocks.fetchWithTimeout,
}));

import {
  accountDeletionConfirmationExpiry,
  createAccountDeletionConfirmationToken,
  hashAccountDeletionConfirmationToken,
  sendAccountDeletionConfirmationEmail,
  sendAccountDeletionPendingEmail,
  sendInactiveAccountExpiryWarningEmail,
} from "./account-deletion-email";

describe("account deletion email", () => {
  beforeEach(() => {
    vi.stubEnv("APP_ORIGIN", "https://studybuddyng.com");
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv(
      "TRANSACTIONAL_EMAIL_FROM",
      "Study Buddy Privacy <no-reply@updates.studybuddyng.com>"
    );
    mocks.fetchWithTimeout.mockReset();
    mocks.fetchWithTimeout.mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("creates a strong one-time token and stores only its hash", () => {
    const confirmation = createAccountDeletionConfirmationToken();

    expect(confirmation.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(confirmation.tokenHash).toHaveLength(64);
    expect(hashAccountDeletionConfirmationToken(confirmation.token)).toBe(
      confirmation.tokenHash
    );
    expect(confirmation.tokenHash).not.toContain(confirmation.token);
  });

  it("uses a bounded configurable confirmation lifetime", () => {
    vi.stubEnv("ACCOUNT_DELETION_CONFIRMATION_TTL_HOURS", "12");
    const now = new Date("2026-09-10T12:00:00.000Z");

    expect(accountDeletionConfirmationExpiry(now).toISOString()).toBe(
      "2026-09-11T00:00:00.000Z"
    );
  });

  it("puts the bearer token in the URL fragment, not the query string", async () => {
    await sendAccountDeletionConfirmationEmail({
      email: "student@example.com",
      token: "a".repeat(43),
      expiresAt: new Date("2026-09-11T12:00:00.000Z"),
    });

    const request = JSON.parse(
      String(mocks.fetchWithTimeout.mock.calls[0][1].body)
    );
    expect(request.text).toContain(
      `/account-deletion/confirm#token=${"a".repeat(43)}`
    );
    expect(request.text).not.toContain("confirm?token=");
  });

  it("sends the final deadline and privacy recovery channel", async () => {
    await sendAccountDeletionPendingEmail({
      email: "student@example.com",
      requestId: "request-1",
      scheduledFor: new Date("2026-09-25T12:00:00.000Z"),
    });

    const request = JSON.parse(
      String(mocks.fetchWithTimeout.mock.calls[0][1].body)
    );
    expect(request.subject).toContain("pending deletion");
    expect(request.text).toContain("15 days");
    expect(request.text).toContain("privacy@studybuddyng.com");
  });

  it("sends an inactivity warning with a reactivation path and deadline", async () => {
    await sendInactiveAccountExpiryWarningEmail({
      email: "student@example.com",
      daysRemaining: 15,
      deletionAt: new Date("2029-09-10T12:00:00.000Z"),
      idempotencyKey: "warning-key",
    });

    const request = JSON.parse(
      String(mocks.fetchWithTimeout.mock.calls[0][1].body)
    );
    expect(request.subject).toContain("15 days");
    expect(request.text).toContain("https://studybuddyng.com/login");
    expect(request.text).toContain("privacy@studybuddyng.com");
    expect(mocks.fetchWithTimeout.mock.calls[0][1].headers).toMatchObject({
      "Idempotency-Key": "inactive-account-expiry-warning-key",
    });
  });
});
