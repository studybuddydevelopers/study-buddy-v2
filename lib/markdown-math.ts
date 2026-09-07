const CODE_SEGMENT_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;
const MATH_SEGMENT_PATTERN = /(\$\$[\s\S]*?\$\$|\$(?!\$)[^$\n]*?\$)/g;

function wrapBareSetOperators(value: string) {
  return value
    .split(MATH_SEGMENT_PATTERN)
    .map((segment, index) => {
      if (index % 2 === 1) return segment;
      return segment.replace(/\\(cup|cap)\b/g, (_, operator: string) =>
        operator === "cup" ? "$\\cup$" : "$\\cap$"
      );
    })
    .join("");
}

function normalizeTextSegment(value: string) {
  const withMarkdownDelimiters = value
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, expression: string) =>
      `$$\n${expression.trim()}\n$$`
    )
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, expression: string) =>
      `$${expression.trim()}$`
    );

  return wrapBareSetOperators(withMarkdownDelimiters);
}

/**
 * Converts common model-produced LaTeX delimiters to remark-math syntax.
 * Existing code samples are deliberately left untouched.
 */
export function normalizeMarkdownMath(markdown: string) {
  return markdown
    .split(CODE_SEGMENT_PATTERN)
    .map((segment, index) =>
      index % 2 === 1 ? segment : normalizeTextSegment(segment)
    )
    .join("");
}
