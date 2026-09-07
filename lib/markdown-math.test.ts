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

  it("wraps bare union and intersection commands as inline maths", () => {
    expect(normalizeMarkdownMath("A \\cup B and C \\cap D")).toBe(
      "A $\\cup$ B and C $\\cap$ D"
    );
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
