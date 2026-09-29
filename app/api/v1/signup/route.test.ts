import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getServerSupabaseConfig: vi.fn(),
  transaction: vi.fn(),
  enforceRateLimitRules: vi.fn(),
  getClientIp: vi.fn(),
  fetchWithTimeout: vi.fn(),
  logSecurityEvent: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
  createGuardianAuthorizationToken: vi.fn(),
  guardianAuthorizationExpiry: vi.fn(),
  sendGuardianAuthorizationEmail: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("@/lib/supabase/config", () => ({ getServerSupabaseConfig: mocks.getServerSupabaseConfig }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimitRules: mocks.enforceRateLimitRules,
  getClientIp: mocks.getClientIp,
}));
vi.mock("@/lib/security/timeouts", () => ({ fetchWithTimeout: mocks.fetchWithTimeout }));
vi.mock("@/lib/security/audit-log", () => ({
  logSecurityEvent: mocks.logSecurityEvent,
  securityFingerprint: (value: string) => `fingerprint:${value}`,
  securityIdentifierHash: (value: string) => `hash:${value}`,
}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: mocks.getSupabaseAdminClient }));
vi.mock("@/lib/guardian-authorization", () => ({
  createGuardianAuthorizationToken: mocks.createGuardianAuthorizationToken,
  guardianAuthorizationExpiry: mocks.guardianAuthorizationExpiry,
  sendGuardianAuthorizationEmail: mocks.sendGuardianAuthorizationEmail,
  normalizeEmail: (value: string) => value.trim().toLowerCase(),
  isValidEmail: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  maskEmail: () => "masked",
}));

import { POST } from "./route";

const appOrigin = "https://studybuddyng.com";

describe("signup request security", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", appOrigin);
    vi.stubEnv("CSRF_TRUSTED_ORIGINS", "");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects a cross-site plain-text JSON form before reading its body or touching auth and persistence", async () => {
    const request = makeRequest({
      origin: "https://attacker.invalid",
      contentType: "text/plain",
      body: '{"firstName":"Student","padding":"="}\r\n',
    });
    expect(request.headers.has("cookie")).toBe(false);

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "CSRF_VALIDATION_FAILED" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.has("Set-Cookie")).toBe(false);
    expect(request.bodyUsed).toBe(false);
    expectNoSignupSideEffects();
  });

  it.each([null, "null", "not-an-origin"])("rejects missing or invalid Origin (%s)", async (origin) => {
    const request = makeRequest({ origin });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(request.bodyUsed).toBe(false);
    expectNoSignupSideEffects();
  });

  it("fails closed without a configured production origin", async () => {
    vi.stubEnv("APP_ORIGIN", "");
    const request = makeRequest();

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(request.bodyUsed).toBe(false);
    expectNoSignupSideEffects();
  });

  it.each([null, "text/plain", "application/x-www-form-urlencoded"])(
    "rejects unsupported Content-Type (%s) before body validation",
    async (contentType) => {
      const request = makeRequest({ contentType });

      const response = await POST(request);

      expect(response.status).toBe(415);
      await expect(response.json()).resolves.toMatchObject({ error: "UNSUPPORTED_MEDIA_TYPE" });
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(request.bodyUsed).toBe(false);
      expectNoSignupSideEffects();
    }
  );

  it("accepts the configured public Origin and JSON charset on a Railway internal URL", async () => {
    const request = makeRequest({
      url: "http://study-buddy-v2.railway.internal:8080/api/v1/signup",
      contentType: "Application/JSON; charset=UTF-8",
    });

    const response = await POST(request);

    // The deliberately incomplete body should reach normal field validation.
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Missing required fields" });
    expect(request.bodyUsed).toBe(true);
    expectNoSignupSideEffects();
  });

  it("retains the streaming body-size limit for trusted JSON signup requests", async () => {
    const response = await POST(makeRequest({ body: JSON.stringify({ padding: "x".repeat(16 * 1024) }) }));

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: "REQUEST_TOO_LARGE" });
    expectNoSignupSideEffects();
  });
});

function makeRequest(options: {
  origin?: string | null;
  contentType?: string | null;
  body?: string;
  url?: string;
} = {}) {
  const request = new Request(options.url ?? `${appOrigin}/api/v1/signup`, {
    method: "POST",
    body: options.body ?? "{}",
  });
  const origin = options.origin === undefined ? appOrigin : options.origin;
  if (origin !== null) request.headers.set("Origin", origin);
  const contentType = options.contentType === undefined ? "application/json" : options.contentType;
  if (contentType === null) request.headers.delete("Content-Type");
  else request.headers.set("Content-Type", contentType);
  return request;
}

function expectNoSignupSideEffects() {
  for (const [name, mock] of Object.entries(mocks)) {
    // A rejected Origin may produce a sanitized security audit event.
    if (name !== "logSecurityEvent") expect(mock).not.toHaveBeenCalled();
  }
}
