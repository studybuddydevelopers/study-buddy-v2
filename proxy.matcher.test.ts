import { describe, expect, it } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "./proxy";

describe("Proxy security coverage", () => {
  it.each([
    "/",
    "/dashboard",
    "/api/health",
    "/api/v1/login",
    "/api/v1/payments/webhook",
    "/robots.txt",
  ])("runs Proxy for security-relevant path %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(
      true
    );
  });

  it.each([
    "/_next/static/chunks/app.js",
    "/_next/image?url=%2Flogo-icon.svg&w=64&q=75",
    "/favicon.ico",
    "/icons/settings.svg",
    "/logo-icon.svg",
  ])("excludes framework or owned static asset %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(
      false
    );
  });

  it.each([
    "/icons-malicious/payload.svg",
    "/favicon.ico-attacker",
    "/logo-icon.svg-attacker",
    "/_next/images-attacker/payload",
  ])("does not let a lookalike static path bypass Proxy: %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(
      true
    );
  });
});
