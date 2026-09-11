import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("password-reset callback", () => {
  beforeEach(() => {
    vi.stubEnv("APP_ORIGIN", "https://studybuddyng.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never exposes Railway's internal localhost origin", async () => {
    const response = await GET(
      new Request(
        "https://localhost:8080/auth/password-reset?token_hash=secret&type=recovery"
      )
    );

    expect(response.headers.get("location")).toBe(
      "https://studybuddyng.com/reset-password/update?token_hash=secret&type=recovery"
    );
  });

  it("sends incomplete recovery links to the canonical request page", async () => {
    const response = await GET(
      new Request(
        "https://localhost:8080/auth/password-reset?token_hash=secret&type=email"
      )
    );

    expect(response.headers.get("location")).toBe(
      "https://studybuddyng.com/forgot-password"
    );
  });
});
