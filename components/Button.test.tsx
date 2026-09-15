import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Button from "./Button";

describe("Button", () => {
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
});
