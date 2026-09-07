import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { describe, expect, it } from "vitest";
import { normalizeMarkdownMath } from "./markdown-math";

describe("normalizeMarkdownMath", () => {
  it("converts parenthesised and bracketed LaTeX delimiters", () => {
    expect(normalizeMarkdownMath("Use \\(A \\cup B\\) here.")).toBe(
      "Use $A \\cup B$ here."
    );
    expect(normalizeMarkdownMath("Then:\n\\[A \\cap B\\]")).toBe(
      "Then:\n$$\nA \\cap B\n$$"
    );
  });

  it("wraps common bare symbolic commands as inline maths", () => {
    expect(normalizeMarkdownMath("A \\cup B, x \\leq 4 and y \\neq 2")).toBe(
      "A $\\cup$ B, x $\\leq$ 4 and y $\\neq$ 2"
    );
  });

  it("wraps common bare grouped expressions", () => {
    expect(
      normalizeMarkdownMath("Use \\frac{1}{2}, \\sqrt{x} and \\vec{v}.")
    ).toBe("Use $\\frac{1}{2}$, $\\sqrt{x}$ and $\\vec{v}$.");
  });

  it("does not nest delimiters around commands already inside maths", () => {
    expect(normalizeMarkdownMath("$A \\cup B$ and $$C \\cap D$$")).toBe(
      "$A \\cup B$ and $$C \\cap D$$"
    );
  });

  it("preserves fenced and inline code examples", () => {
    const markdown = "`\\cup`\n\n```tex\nA \\cap B\n```";
    expect(normalizeMarkdownMath(markdown)).toBe(markdown);
  });

  it("protects currency amounts without disturbing numeric maths", () => {
    expect(normalizeMarkdownMath("It costs $5 and $10 per month.")).toBe(
      "It costs \\$5 and \\$10 per month."
    );
    expect(normalizeMarkdownMath("The value is $2 + 1$."))
      .toBe("The value is $2 + 1$.");
  });

  it("produces KaTeX markup for union and intersection symbols", () => {
    const html = renderToStaticMarkup(
      createElement(
        ReactMarkdown,
        {
          remarkPlugins: [remarkMath],
          rehypePlugins: [[rehypeKatex, { strict: false }]],
        },
        normalizeMarkdownMath("A \\cup B and C \\cap D")
      )
    );

    expect(html).toContain('class="katex"');
    expect(html).toContain("<mo>∪</mo>");
    expect(html).toContain("<mo>∩</mo>");
  });
});
