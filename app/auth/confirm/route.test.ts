import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { verifyOtp: mocks.verifyOtp },
  }),
}));

vi.mock("@/lib/supabase/config", () => ({
  getServerSupabaseConfig: () => ({
    url: "https://project.supabase.co",
    key: "public-key",
  }),
}));

vi.mock("@/lib/security/timeouts", () => ({
  fetchWithTimeout: vi.fn(),
}));

import { GET } from "./route";

describe("email confirmation callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("APP_ORIGIN", "https://studybuddyng.com");
    mocks.verifyOtp.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exchanges the token hash and removes it from the redirect", async () => {
    const response = await GET(
      new Request(
        "https://localhost:8080/auth/confirm?token_hash=secret&type=email"
      )
    );

    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "secret",
      type: "email",
    });
    expect(response.headers.get("location")).toBe(
      "https://studybuddyng.com/dashboard?email_confirmed=true"
    );
    expect(response.headers.get("location")).not.toContain("secret");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("sends reused or expired links to a visible error state", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } });

    const response = await GET(
      new Request(
        "https://studybuddyng.com/auth/confirm?token_hash=used&type=email"
      )
    );

    expect(response.headers.get("location")).toBe(
      "https://studybuddyng.com/verify-email?status=expired"
    );
  });

  it("rejects missing or unexpected token types without verification", async () => {
    const response = await GET(
      new Request(
        "https://studybuddyng.com/auth/confirm?token_hash=secret&type=recovery"
      )
    );

    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://studybuddyng.com/verify-email?status=invalid"
    );
  });
});
