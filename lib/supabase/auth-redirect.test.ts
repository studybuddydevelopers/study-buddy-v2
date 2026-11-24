import { afterEach, describe, expect, it, vi } from "vitest";
import { authRedirectUrl, trustedAppOrigin } from "./auth-redirect";

describe("authentication email redirects", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the configured canonical production origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "https://studybuddyng.com");

    expect(authRedirectUrl("/auth/password-reset")).toBe(
      "https://studybuddyng.com/auth/password-reset"
    );
  });

  it.each([
    "https://localhost:8080",
    "http://studybuddyng.com",
    "https://127.0.0.1",
  ])("rejects an unsafe production APP_ORIGIN: %s", (origin) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", origin);

    expect(() => trustedAppOrigin()).toThrow(
      "APP_ORIGIN must be a public HTTPS origin in production."
    );
  });

  it("allows a loopback production origin only for the isolated E2E harness", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3200");
    vi.stubEnv("STUDY_BUDDY_E2E_TEST_MODE", "true");
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://postgres:test@127.0.0.1:55432/studybuddy_e2e"
    );
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:55431");

    expect(trustedAppOrigin()).toBe("http://127.0.0.1:3200");
  });

  it("rejects the E2E exception in a deployed Railway environment", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3200");
    vi.stubEnv("STUDY_BUDDY_E2E_TEST_MODE", "true");
    vi.stubEnv("RAILWAY_ENVIRONMENT_ID", "production");
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://postgres:test@127.0.0.1:55432/studybuddy_e2e"
    );
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:55431");

    expect(() => trustedAppOrigin()).toThrow(
      "APP_ORIGIN must be a public HTTPS origin in production."
    );
  });

  it("rejects the E2E exception when a dependency is not loopback-only", () => {
    const remoteDatabaseUrl = new URL(
      "postgresql://db.example/studybuddy_e2e"
    );
    remoteDatabaseUrl.username = "postgres";
    remoteDatabaseUrl.password = "test";

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "http://127.0.0.1:3200");
    vi.stubEnv("STUDY_BUDDY_E2E_TEST_MODE", "true");
    vi.stubEnv("DATABASE_URL", remoteDatabaseUrl.toString());
    vi.stubEnv("SUPABASE_URL", "http://127.0.0.1:55431");

    expect(() => trustedAppOrigin()).toThrow(
      "APP_ORIGIN must be a public HTTPS origin in production."
    );
  });

  it("does not accept a path in APP_ORIGIN", () => {
    vi.stubEnv("APP_ORIGIN", "https://studybuddyng.com/login");

    expect(() => trustedAppOrigin()).toThrow(
      "APP_ORIGIN must not contain a path, query, or fragment."
    );
  });

  it("uses the request origin only outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_ORIGIN", "");

    expect(
      authRedirectUrl(
        "/auth/password-reset",
        "http://localhost:4321/api/v1/reset-password"
      )
    ).toBe("http://localhost:4321/auth/password-reset");
  });
});
