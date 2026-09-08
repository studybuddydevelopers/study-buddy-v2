import { describe, expect, it } from "vitest";
import { normalizeMarkdownMath } from "./markdown-math";

describe("normalizeMarkdownMath", () => {
  it("converts parenthesised and bracketed LaTeX delimiters", () => {
    expect(normalizeMarkdownMath("Use \\(A \\cup B\\) here.")).toBe(
      "Use $A \\cup B$ here."
    );
    expect(normalizeMarkdownMath("Then:\n\\[A \\cap B\\]")).toBe(
      "Then:\n\n\n$$\nA \\cap B\n$$\n\n"
    );
  });

  it("repairs doubled delimiters and nested dollar signs from model output", () => {
    expect(
      normalizeMarkdownMath(String.raw`Then: \\[ A $\cap$ B \\]`)
    ).toBe("Then: \n\n$$\nA \\cap B\n$$\n\n");
  });

  it("repairs over-escaped Markdown lists and emphasis", () => {
    const markdown = String.raw`1\. Definition

\- \*\*Intersection\*\*: Common elements`;

    expect(normalizeMarkdownMath(markdown)).toBe(
      "1. Definition\n\n- **Intersection**: Common elements"
    );
  });

  it("removes unmatched TeX wrappers without swallowing later prose", () => {
    expect(normalizeMarkdownMath(String.raw`Before \\[ A $\cap$ B`)).toBe(
      "Before  A $\\cap$ B"
    );
  });

  it("wraps common bare symbolic commands as inline maths", () => {
    expect(normalizeMarkdownMath("A \\cup B, x \\leq 4 and y \\neq 2")).toBe(
      "A $\\cup$ B, x $\\leq$ 4 and y $\\neq$ 2"
    );
  });

  it("wraps common bare grouped expressions", () => {
    expect(
      normalizeMarkdownMath(
        "Use \\frac{1}{2}, \\sqrt{x}, \\vec{v} and \\text{or}."
      )
    ).toBe(
      "Use $\\frac{1}{2}$, $\\sqrt{x}$, $\\vec{v}$ and $\\text{or}$."
    );
  });

  it("renders every command in a bare set-builder expression", () => {
    expect(
      normalizeMarkdownMath(
        String.raw`A \cup B = {x | x \in A \text{ or } x \in B}`
      )
    ).toBe(
      String.raw`A $\cup$ B = {x | x $\in$ A $\text{ or }$ x $\in$ B}`
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

  it("protects currency amounts without disturbing numeric maths", () => {
    expect(normalizeMarkdownMath("It costs $5 and $10 per month.")).toBe(
      "It costs \\$5 and \\$10 per month."
    );
    expect(normalizeMarkdownMath("The value is $2 + 1$."))
      .toBe("The value is $2 + 1$.");
  });

});
