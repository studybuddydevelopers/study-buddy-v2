import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProgressBar from "./ProgressBar";

describe("ProgressBar", () => {
  it("exposes its label and bounded value to assistive technology", () => {
    const html = renderToStaticMarkup(
      createElement(ProgressBar, {
        label: "Mathematics score",
        percentage: 126,
      })
    );

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Mathematics score"');
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain('style="width:100%"');
  });

  it("does not render negative fill widths", () => {
    const html = renderToStaticMarkup(
      createElement(ProgressBar, { percentage: -10 })
    );

    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain('style="width:0%"');
  });
});
