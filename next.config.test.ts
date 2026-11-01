import { afterEach, describe, expect, it, vi } from "vitest";

type HeaderEntry = { key: string; value: string };
type HeaderRule = { source: string; headers: HeaderEntry[] };
type TestableNextConfig = {
  poweredByHeader?: boolean;
  headers: () => Promise<HeaderRule[]>;
};

describe("Next.js security headers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("applies the complete production header baseline to every route", async () => {
    const config = await loadConfig("production");
    const headers = await globalHeaders(config);

    expect(config.poweredByHeader).toBe(false);
    expect(Object.fromEntries(headers.map(({ key, value }) => [key, value])))
      .toEqual({
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy":
          "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), browsing-topics=()",
        "X-Frame-Options": "DENY",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      });
  });

  it("does not send HSTS from a local development server", async () => {
    const headers = await globalHeaders(await loadConfig("development"));

    expect(headers.map(({ key }) => key)).not.toContain(
      "Strict-Transport-Security"
    );
    expect(headers).toEqual(
      expect.arrayContaining([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
      ])
    );
  });

  it("keeps immutable asset caching scoped to owned icon paths", async () => {
    const config = await loadConfig("production");
    const rules = await config.headers();
    const cacheRules = rules.filter((rule) =>
      rule.headers.some(({ key }) => key === "Cache-Control")
    );

    expect(cacheRules).toEqual([
      {
        source: "/logo-icon.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]);
  });
});

async function loadConfig(nodeEnv: "development" | "production") {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", nodeEnv);
  const imported = await import("./next.config.js");
  return imported.default as TestableNextConfig;
}

async function globalHeaders(config: TestableNextConfig) {
  const rules = await config.headers();
  const globalRule = rules.find((rule) => rule.source === "/:path*");
  if (!globalRule) throw new Error("Expected a global security-header rule");
  return globalRule.headers;
}
