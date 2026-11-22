import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClientLayoutWrapper from "./ClientLayoutWrapper";
import BottomNav from "@/components/BottomNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/progress",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

// Dynamic mobile navigation is client-only, so it also has a direct render test.
// Real providers/components are used; SSR does not run their fetching effects.
describe("shared shell accessibility", () => {
  const fetch = vi.fn(() => { throw new Error("Shell markup tests must not contact a service"); });
  beforeEach(() => { fetch.mockClear(); vi.stubGlobal("fetch", fetch); });
  afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals(); });

  it.each([false, true])("keeps chrome outside the only main landmark (authenticated=%s)", (isAuthenticated) => {
    const html = renderToStaticMarkup(
      <ClientLayoutWrapper isAuthenticated={isAuthenticated}><h1>Study content</h1></ClientLayoutWrapper>
    );
    expect(html.match(/<main\b/g)).toHaveLength(1);
    const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
    expect(main).toContain('id="main-content"');
    expect(main).toContain('tabindex="-1"');
    expect(main).toContain("<h1>Study content</h1>");
    expect(main).not.toMatch(/<(?:header|footer|nav)\b/);
    expect(html.indexOf("</header>")).toBeLessThan(html.indexOf("<main"));
    expect(html.indexOf("<footer")).toBeGreaterThan(html.indexOf("</main>"));
    expect(html.match(/<a\b[^>]*>[\s\S]*?<\/a>/)?.[0]).toBe(
      '<a href="#main-content" class="skip-link">Skip to main content</a>'
    );
    const homeLink = html.match(/<a\b[^>]*aria-label="Study Buddy home"[^>]*>/)?.[0];
    expect(homeLink).toContain(`href="${isAuthenticated ? "/dashboard" : "/"}"`);
  });

  it("names desktop navigation and exposes only the matching product link as current", () => {
    const html = renderToStaticMarkup(<ClientLayoutWrapper isAuthenticated><h1>Progress</h1></ClientLayoutWrapper>);
    const nav = html.match(/<nav\b[^>]*aria-label="Primary navigation"[\s\S]*?<\/nav>/)?.[0] ?? "";
    expect(nav).not.toBe("");
    const current = nav.match(/<a\b[^>]*aria-current="page"[^>]*>/g) ?? [];
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/progress"');
    expect(nav).toContain('href="/profile"');
    expect(html).toContain('aria-label="Footer"');
  });

  it("gives mobile navigation a distinct name, six destinations and a current page", () => {
    const html = renderToStaticMarkup(<BottomNav />);
    expect(html).toContain('aria-label="Primary mobile navigation"');
    expect(html.match(/<a\b/g)).toHaveLength(6);
    const current = html.match(/<a\b[^>]*aria-current="page"[^>]*>/g) ?? [];
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/progress"');
    for (const name of ["Home", "Materials", "Exams", "Progress", "Chat", "Profile"]) {
      expect(html).toContain(`>${name}</span>`);
    }
  });

  it("keeps both active and inactive mobile labels at 4.5:1 contrast against white", () => {
    const html = renderToStaticMarkup(<BottomNav />);
    const colors = [...html.matchAll(/<span\b[^>]*style="color:(#[0-9a-f]{6})"/gi)].map((match) => match[1]);
    expect(colors).toHaveLength(6);
    for (const hex of colors) {
      const channels = [1, 3, 5].map((offset) => {
        const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      expect(1.05 / (luminance + 0.05), `Label colour ${hex} against white`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
