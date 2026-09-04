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
  });

  it("rejects declared oversized API requests before authentication", async () => {
    const response = await proxy(
      new NextRequest("https://studybuddy.example/api/v1/contact", {
        method: "POST",
        headers: { "Content-Length": String(31 * 1024 * 1024) },
      })
    );

    expect(response.status).toBe(413);
  });
});
