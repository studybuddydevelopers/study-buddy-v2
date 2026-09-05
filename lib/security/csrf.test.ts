import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { validateCookieMutationOrigin } from "./csrf";

const authCookie = "sb-project-ref-auth-token=encoded-session";

describe("cookie-authenticated mutation Origin validation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("allows safe methods without an Origin header", () => {
    const request = makeRequest("GET", "/api/v1/me", {
      cookie: authCookie,
    });

    expect(validateCookieMutationOrigin(request)).toEqual({ ok: true });
  });

  it("allows a same-origin mutation in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const request = makeRequest("POST", "/api/v1/logout", {
      cookie: authCookie,
      origin: "https://studybuddy.example",
    });

    expect(validateCookieMutationOrigin(request)).toEqual({ ok: true });
  });

  it("uses the explicit production allowlist", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "https://app.studybuddy.example");
    vi.stubEnv(
      "CSRF_TRUSTED_ORIGINS",
      "https://preview.studybuddy.example, https://admin.studybuddy.example"
    );
    const request = makeRequest("PATCH", "/api/v1/profile", {
      cookie: authCookie,
      origin: "https://preview.studybuddy.example",
    });

    expect(validateCookieMutationOrigin(request)).toEqual({ ok: true });
  });

  it("rejects a cross-origin cookie-authenticated mutation", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "https://studybuddy.example");
    const request = makeRequest("POST", "/api/v1/ai/messages", {
      cookie: authCookie,
      origin: "https://attacker.example",
    });

    expect(validateCookieMutationOrigin(request)).toEqual({
      ok: false,
      reason: "UNTRUSTED_ORIGIN",
    });
  });

  it("rejects a mutation with a session cookie and no Origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "https://studybuddy.example");
    const request = makeRequest("DELETE", "/api/v1/ai/chats/123", {
      cookie: authCookie,
    });

    expect(validateCookieMutationOrigin(request)).toEqual({
      ok: false,
      reason: "MISSING_ORIGIN",
    });
  });

  it("does not apply cookie CSRF checks to signed webhooks or cron", () => {
    vi.stubEnv("NODE_ENV", "production");

    for (const pathname of [
      "/api/v1/payments/webhook",
      "/api/v1/whatsapp/webhook/",
      "/api/v1/ai/recommendations/cron",
    ]) {
      const request = makeRequest("POST", pathname, { cookie: authCookie });
      expect(validateCookieMutationOrigin(request)).toEqual({ ok: true });
    }
  });

  it("does not require Origin when no auth cookie is present", () => {
    vi.stubEnv("NODE_ENV", "production");
    const request = makeRequest("POST", "/api/v1/login");

    expect(validateCookieMutationOrigin(request)).toEqual({ ok: true });
  });
});

function makeRequest(
  method: string,
  pathname: string,
  headers: Record<string, string> = {}
) {
  return new NextRequest(`https://studybuddy.example${pathname}`, {
    method,
    headers,
  });
}
