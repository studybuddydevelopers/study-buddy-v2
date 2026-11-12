import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("renders navigation as one link, without a nested button", () => {
    const html = renderToStaticMarkup(createElement(Button, { href: "/materials" }, "Browse materials"));
    expect(html).toContain('href="/materials"');
    expect(html).not.toContain("<button");
  });

  it("does not navigate when a link-styled action is disabled", () => {
    const html = renderToStaticMarkup(createElement(Button, { href: "/materials", disabled: true }, "Browse materials"));
    expect(html).not.toContain("href=");
    expect(html).toContain('disabled=""');
  });
  it("keeps an aria-disabled explanatory action operable", () => {
    const html = renderToStaticMarkup(
      createElement(
        Button,
        {
          ariaDisabled: true,
          ariaDescribedBy: "missing-link-message",
        },
        "Show why this is unavailable"
      )
    );

    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-describedby="missing-link-message"');
    expect(html).not.toContain(" disabled=");
    expect(html).toContain("cursor-help");
    expect(html).not.toContain("pointer-events-none");
  });

  it("keeps native disabled buttons non-interactive", () => {
    const html = renderToStaticMarkup(
      createElement(Button, { disabled: true }, "Unavailable")
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("pointer-events-none");
  });

  it.each([
    { state: "disabled", props: { disabled: true } },
    { state: "loading", props: { loading: true } },
    { state: "disabled variant", props: { variant: "disabledPlain" as const } },
  ])("does not expose a navigation target in the $state state", ({ props }) => {
    const html = renderToStaticMarkup(createElement(Button, { href: "/materials", ...props }, "Browse materials"));
    expect(html).toContain("<button");
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("href=");
  });

  it("retains an explanatory action but not a destination for aria-disabled navigation", () => {
    const html = renderToStaticMarkup(createElement(Button, {
      href: "/materials", ariaDisabled: true, ariaDescribedBy: "unavailable-reason",
    }, "Browse materials"));
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-describedby="unavailable-reason"');
    expect(html).not.toContain("href=");
    expect(html).not.toContain(" disabled=");
  });

  it("exposes busy state without adding its decorative spinner to the accessible name", () => {
    const html = renderToStaticMarkup(createElement(Button, { loading: true }, "Save profile"));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Save profile"');
    expect(html.match(/<svg\b[^>]*>/)?.[0]).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(createElement(Button, {}, "Save profile"))).not.toContain("aria-busy=");
  });

  it("preserves explicit navigation names/descriptions and hides the decorative icon", () => {
    const html = renderToStaticMarkup(createElement(Button, {
      href: "/materials", ariaLabel: "Browse study materials", ariaDescribedBy: "materials-help",
      icon: createElement("svg", null, createElement("title", null, "Decorative book")),
    }, "Browse"));
    expect(html).toContain('aria-label="Browse study materials"');
    expect(html).toContain('aria-describedby="materials-help"');
    expect(html).toContain('<span aria-hidden="true"><svg>');
    expect(html.match(/<a\b/g)).toHaveLength(1);
    expect(html).not.toContain("<button");
  });
});
