import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ChatMarkdown from "./ChatMarkdown";

function render(markdown: string) {
  return renderToStaticMarkup(createElement(ChatMarkdown, { markdown }));
}

describe("ChatMarkdown", () => {
  it("renders normalised LaTeX through the sanitised KaTeX pipeline", () => {
    const html = render("A \\cup B, C \\cap D and \\frac{1}{2}");

    expect(html).toContain('class="katex"');
    expect(html).toContain("<mo>∪</mo>");
    expect(html).toContain("<mo>∩</mo>");
    expect(html).toContain('class="mfrac"');
  });

  it("leaves currency as text instead of treating it as maths", () => {
    const html = render("It costs $5 and $10 per month.");

    expect(html).toContain("$5 and $10 per month.");
    expect(html).not.toContain('class="katex"');
  });

  it("renders GFM tables, task lists, strikethrough and deliberate line breaks", () => {
    const html = render(
      "| Topic | Score |\n| --- | --- |\n| Sets | 8 |\n\n- [x] Revise\n\n~~old~~\nnew line"
    );

    expect(html).toContain("<table");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("<del>old</del>");
    expect(html).toContain("<br/>");
  });

  it("renders a safe subset of HTML and removes executable HTML", () => {
    const html = render(
      "x<sup>2</sup><br>H<sub>2</sub>O<script>alert('bad')</script>"
    );

    expect(html).toContain("<sup>2</sup>");
    expect(html).toContain("<sub>2</sub>");
    expect(html).toContain("<br/>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
  });

  it("opens external links safely and does not load Markdown images", () => {
    const html = render(
      "[Example](https://example.com) ![diagram](https://tracker.example/pixel.png)"
    );

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("<img");
    expect(html).toContain("Image not loaded: diagram");
    expect(html).not.toContain("tracker.example");
  });

  it("removes unsafe link targets", () => {
    const html = render("[Do not open](javascript:alert('bad'))");

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("href=");
    expect(html).toContain("Do not open");
  });

  it("highlights fenced source code while leaving Mermaid as readable code", () => {
    const highlighted = render("```js\nconst answer = 42;\n```");
    const mermaid = render("```mermaid\ngraph TD; A-->B;\n```");

    expect(highlighted).toContain("hljs");
    expect(highlighted).toContain("Copy code");
    expect(mermaid).toContain("graph TD; A--&gt;B;");
    expect(mermaid).not.toContain("language-undefined");
  });

  it("keeps malformed LaTeX readable instead of throwing", () => {
    expect(() => render("An incomplete expression: $\\frac{1}{$"))
      .not.toThrow();
  });
});
