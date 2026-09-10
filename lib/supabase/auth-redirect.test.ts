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
