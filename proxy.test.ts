import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("production route controls", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    "/icon-audit",
    "/temp-logo-preview",
    "/new-logo-preview",
    "/cube-usage-audit",
    "/demo-showcase",
  ])("returns 404 for %s in production", async (pathname) => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await proxy(
      new NextRequest(`https://studybuddy.example${pathname}`)
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toMatch(/script-src [^;]*'nonce-[^']+' [^;]*'strict-dynamic'/);
    expect(csp?.match(/script-src [^;]*/)?.[0]).not.toContain("'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("rejects declared oversized API requests before authentication", async () => {
    const response = await proxy(
      new NextRequest("https://studybuddy.example/api/v1/contact", {
        method: "POST",
        headers: { "Content-Length": String(31 * 1024 * 1024) },
      })
    );

    expect(response.status).toBe(413);
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "script-src 'self' 'nonce-"
    );
  });

  it("rejects a cross-origin mutation carrying a Supabase session cookie", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "https://studybuddy.example");

    const response = await proxy(
      new NextRequest("https://studybuddy.example/api/v1/profile", {
        method: "PATCH",
        headers: {
          cookie: "sb-project-ref-auth-token=encoded-session",
          origin: "https://attacker.example",
        },
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: "CSRF_VALIDATION_FAILED",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "script-src 'self' 'nonce-"
    );
  });

  it("generates a different script nonce for every request", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const first = await proxy(
      new NextRequest("https://studybuddy.example/icon-audit")
    );
    const second = await proxy(
      new NextRequest("https://studybuddy.example/icon-audit")
    );
    const noncePattern = /'nonce-([^']+)'/;
    const firstNonce = first.headers
      .get("Content-Security-Policy")
      ?.match(noncePattern)?.[1];
    const secondNonce = second.headers
      .get("Content-Security-Policy")
      ?.match(noncePattern)?.[1];

    expect(firstNonce).toBeTruthy();
    expect(secondNonce).toBeTruthy();
    expect(firstNonce).not.toBe(secondNonce);
  });
});
