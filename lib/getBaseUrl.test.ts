import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

import { getBaseUrl } from "./getBaseUrl";

describe("getBaseUrl", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    headersMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses APP_ORIGIN in production instead of Railway's internal host", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "https://studybuddyng.com");
    headersMock.mockResolvedValue(
      new Headers({
        host: "localhost:8080",
        "x-forwarded-proto": "https",
      })
    );

    await expect(getBaseUrl()).resolves.toBe("https://studybuddyng.com");
    expect(headersMock).not.toHaveBeenCalled();
  });

  it("does not trust a supplied production Host header", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "https://studybuddyng.com");
    headersMock.mockResolvedValue(
      new Headers({
        host: "attacker.example",
        "x-forwarded-proto": "https",
      })
    );

    await expect(getBaseUrl()).resolves.toBe("https://studybuddyng.com");
    expect(headersMock).not.toHaveBeenCalled();
  });

  it("fails closed when production APP_ORIGIN is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_ORIGIN", "");

    await expect(getBaseUrl()).rejects.toThrow(
      "APP_ORIGIN is required for authentication emails."
    );
    expect(headersMock).not.toHaveBeenCalled();
  });

  it("uses the active host and port outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    headersMock.mockResolvedValue(
      new Headers({
        host: "localhost:4321",
        "x-forwarded-proto": "http",
      })
    );

    await expect(getBaseUrl()).resolves.toBe("http://localhost:4321");
  });
});
