import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("metadata routes", () => {
  it("publishes only public pages in the sitemap", () => {
    vi.stubEnv("APP_ORIGIN", "https://studybuddy.example");

    const entries = sitemap();
    const urls = entries.map(({ url }) => url);

    expect(urls).toContain("https://studybuddy.example/");
    expect(urls).toContain("https://studybuddy.example/privacy-policy");
    expect(urls).not.toContain("https://studybuddy.example/dashboard");
    expect(urls).not.toContain("https://studybuddy.example/login");
  });

  it("keeps protected, account and internal routes out of crawler access", () => {
    vi.stubEnv("APP_ORIGIN", "https://studybuddy.example");

    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rules.allow).toBe("/");
    expect(rules.disallow).toEqual(
      expect.arrayContaining([
        "/api/",
        "/chat",
        "/dashboard",
        "/login",
        "/materials",
        "/temp-logo-preview",
      ])
    );
    expect(result.sitemap).toBe("https://studybuddy.example/sitemap.xml");
    expect(result.host).toBe("https://studybuddy.example");
  });

  it("omits deployment URLs when APP_ORIGIN is not configured", () => {
    vi.stubEnv("APP_ORIGIN", "");

    expect(sitemap()).toEqual([]);
    expect(robots()).not.toHaveProperty("sitemap");
    expect(robots()).not.toHaveProperty("host");
  });
});
