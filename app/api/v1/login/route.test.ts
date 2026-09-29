import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  signInWithPassword: vi.fn(),
  getServerSupabaseConfig: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  enforceRateLimitRules: vi.fn(),
  getClientIp: vi.fn(),
  fetchWithTimeout: vi.fn(),
  logSecurityEvent: vi.fn(),
  syncAuthAccountStatus: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));
vi.mock("@/lib/supabase/config", () => ({
  getServerSupabaseConfig: mocks.getServerSupabaseConfig,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
  },
}));
vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimitRules: mocks.enforceRateLimitRules,
  getClientIp: mocks.getClientIp,
}));
vi.mock("@/lib/security/timeouts", () => ({
  fetchWithTimeout: mocks.fetchWithTimeout,
}));
vi.mock("@/lib/security/audit-log", () => ({
  logSecurityEvent: mocks.logSecurityEvent,
  securityFingerprint: (value: string) => `fingerprint:${value}`,
  securityIdentifierHash: (value: string) => `hash:${value}`,
}));
vi.mock("@/lib/guardian-authorization", () => ({
  syncAuthAccountStatus: mocks.syncAuthAccountStatus,
}));

import { POST } from "./route";

const appOrigin = "https://studybuddyng.com";
const credentials = {
  identifier: "student@example.invalid",
  password: "DisposableTestOnly!",
};

type CookieHooks = {
  cookies: {
    setAll: (
      cookies: { name: string; value: string; options: { sameSite: "lax" } }[]
    ) => void;
  };
};

describe("login request security", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", appOrigin);
    vi.stubEnv("CSRF_TRUSTED_ORIGINS", "");
    mocks.enforceRateLimitRules.mockResolvedValue(null);
    mocks.getClientIp.mockReturnValue("203.0.113.9");
    mocks.getServerSupabaseConfig.mockReturnValue({
      url: "https://test-project.supabase.co",
      key: "test-publishable-key",
    });
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: "student-id", user_metadata: { accountStatus: "ACTIVE" } } },
      error: null,
    });
    mocks.userFindUnique.mockResolvedValue({
      accountStatus: "ACTIVE",
      authEmailFingerprint: `hash:${credentials.identifier}`,
    });
    mocks.createServerClient.mockImplementation(
      (_url: string, _key: string, options: CookieHooks) => ({
        auth: {
          signInWithPassword: async (input: unknown) => {
            const result = await mocks.signInWithPassword(input);
            if (!result.error) {
              options.cookies.setAll([
                {
                  name: "sb-test-project-auth-token",
                  value: "test-session",
                  options: { sameSite: "lax" },
                },
              ]);
            }
            return result;
          },
        },
      })
    );
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects a cross-site text/plain JSON form before reading its body or creating a session", async () => {
    // A text/plain HTML form inserts '=' between its field name and value.
    // Placing it inside this ignored string produces valid JSON without CORS.
    const fieldName = JSON.stringify({ ...credentials, padding: "" }).slice(0, -2);
    const body = `${fieldName}="}\r\n`;
    expect(JSON.parse(body)).toEqual({ ...credentials, padding: "=" });
    const request = makeRequest({
      origin: "https://attacker.invalid",
      contentType: "text/plain",
      body,
      url: `${appOrigin}/api/v1/login?private=test-query-value`,
    });
    expect(request.headers.has("cookie")).toBe(false);

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "CSRF_VALIDATION_FAILED" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.has("Set-Cookie")).toBe(false);
    expect(request.bodyUsed).toBe(false);
    expectNoAuthenticationSideEffects();
    expect(mocks.logSecurityEvent).toHaveBeenCalledExactlyOnceWith(
      "csrf_validation_failed",
      "warn",
      {
        reason: "UNTRUSTED_ORIGIN",
        method: "POST",
        path: "/api/v1/login",
      }
    );
  });

  it.each([null, "null", "not-an-origin", "https://studybuddyng.com.attacker.invalid"])(
    "rejects an absent or untrusted Origin (%s) before consuming JSON",
    async (origin) => {
      const request = makeRequest({ origin });

      const response = await POST(request);

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({ error: "CSRF_VALIDATION_FAILED" });
      expect(request.bodyUsed).toBe(false);
      expectNoAuthenticationSideEffects();
    }
  );

  it("fails closed in production when there is no configured trusted origin", async () => {
    vi.stubEnv("APP_ORIGIN", "");
    const request = makeRequest();

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(request.bodyUsed).toBe(false);
    expectNoAuthenticationSideEffects();
  });

  it.each([null, "text/plain", "application/x-www-form-urlencoded", "multipart/form-data", "application/jsonp"])(
    "rejects a same-origin request with unsupported Content-Type (%s)",
    async (contentType) => {
      const request = makeRequest({ contentType });

      const response = await POST(request);

      expect(response.status).toBe(415);
      await expect(response.json()).resolves.toMatchObject({ error: "UNSUPPORTED_MEDIA_TYPE" });
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.has("Set-Cookie")).toBe(false);
      expect(request.bodyUsed).toBe(false);
      expectNoAuthenticationSideEffects();
    }
  );

  it("accepts the public production origin on an internal Railway URL and preserves login cookies", async () => {
    const response = await POST(makeRequest({
      url: "http://study-buddy-v2.railway.internal:8080/api/v1/login",
      contentType: "Application/JSON; charset=UTF-8",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(response.headers.get("X-Study-Buddy-Next")).toBe("/dashboard");
    expect(response.headers.get("Set-Cookie")).toContain("sb-test-project-auth-token=test-session");
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: credentials.identifier,
      password: credentials.password,
      options: { captchaToken: undefined },
    });
    expect(mocks.userFindUnique).toHaveBeenCalledOnce();
  });

  it("keeps rejected credentials generic and does not persist a session", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Sensitive upstream authentication details" },
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Invalid email/phone number or password." });
    expect(response.headers.has("Set-Cookie")).toBe(false);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("allows a same-origin localhost login in development without APP_ORIGIN", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ORIGIN", "");

    const response = await POST(makeRequest({
      origin: "http://localhost:3000",
      url: "http://localhost:3000/api/v1/login",
    }));

    expect(response.status).toBe(200);
    expect(mocks.signInWithPassword).toHaveBeenCalledOnce();
    expect(response.headers.get("Set-Cookie")).toContain("sb-test-project-auth-token=test-session");
  });

  it("allows an explicitly trusted additional production origin", async () => {
    vi.stubEnv("CSRF_TRUSTED_ORIGINS", "https://www.studybuddyng.com");

    const response = await POST(makeRequest({ origin: "https://www.studybuddyng.com" }));

    expect(response.status).toBe(200);
    expect(mocks.signInWithPassword).toHaveBeenCalledOnce();
    expect(mocks.logSecurityEvent).not.toHaveBeenCalled();
  });

  it("preserves phone login and forwards the CAPTCHA token to Supabase", async () => {
    const response = await POST(makeRequest({
      body: JSON.stringify({
        identifier: "+2348000000000",
        password: credentials.password,
        captchaToken: "test-captcha-token",
      }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      phone: "+2348000000000",
      password: credentials.password,
      options: { captchaToken: "test-captcha-token" },
    });
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("preserves rate limiting before contacting Supabase", async () => {
    mocks.enforceRateLimitRules.mockResolvedValue(
      Response.json({ error: "RATE_LIMITED" }, { status: 429 })
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);
    expect(mocks.enforceRateLimitRules).toHaveBeenCalledOnce();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it.each(["{", "[]", "{}"])("still rejects malformed or incomplete JSON (%s)", async (body) => {
    const response = await POST(makeRequest({ body }));

    expect(response.status).toBe(400);
    expectNoAuthenticationSideEffects();
  });

  it("enforces the 16 KiB body limit even without Content-Length", async () => {
    const request = makeRequest({
      body: JSON.stringify({ ...credentials, padding: "x".repeat(16 * 1024) }),
    });
    expect(request.headers.has("content-length")).toBe(false);

    const response = await POST(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: "REQUEST_TOO_LARGE" });
    expectNoAuthenticationSideEffects();
  });
});

function makeRequest(options: {
  origin?: string | null;
  contentType?: string | null;
  body?: string;
  url?: string;
} = {}) {
  const request = new Request(options.url ?? `${appOrigin}/api/v1/login`, {
    method: "POST",
    body: options.body ?? JSON.stringify(credentials),
  });
  const origin = options.origin === undefined ? appOrigin : options.origin;
  if (origin !== null) request.headers.set("Origin", origin);
  const contentType = options.contentType === undefined ? "application/json" : options.contentType;
  if (contentType === null) request.headers.delete("Content-Type");
  else request.headers.set("Content-Type", contentType);
  return request;
}

function expectNoAuthenticationSideEffects() {
  expect(mocks.enforceRateLimitRules).not.toHaveBeenCalled();
  expect(mocks.getClientIp).not.toHaveBeenCalled();
  expect(mocks.getServerSupabaseConfig).not.toHaveBeenCalled();
  expect(mocks.createServerClient).not.toHaveBeenCalled();
  expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  expect(mocks.userFindUnique).not.toHaveBeenCalled();
  expect(mocks.userUpdate).not.toHaveBeenCalled();
  expect(mocks.fetchWithTimeout).not.toHaveBeenCalled();
  expect(mocks.syncAuthAccountStatus).not.toHaveBeenCalled();
}
