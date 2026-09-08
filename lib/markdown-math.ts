const CODE_SEGMENT_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;
const MATH_SEGMENT_PATTERN = /(\$\$[\s\S]*?\$\$|\$(?!\$)[^$\n]*?\$)/g;
const SIMPLE_LATEX_COMMAND_PATTERN =
  /\\(cup|cap|setminus|subset|subseteq|supset|supseteq|in|notin|emptyset|varnothing|mid|forall|exists|neg|land|lor|leq|geq|neq|approx|equiv|times|div|cdot|pm|infty|sum|prod|rightarrow|leftarrow|leftrightarrow|ldots|cdots|theta|alpha|beta|gamma|delta|pi)\b/g;
const GROUPED_LATEX_COMMAND_PATTERNS = [
  /\\frac\s*\{[^{}\n]+\}\s*\{[^{}\n]+\}/g,
  /\\sqrt(?:\s*\[[^\]\n]+\])?\s*\{[^{}\n]+\}/g,
  /\\(?:overline|underline|vec)\s*\{[^{}\n]+\}/g,
  /\\(?:text|mathrm|mathbf|mathit|mathbb|mathcal)\s*\{[^{}\n]+\}/g,
] as const;

function normalizeOverEscapedMarkdown(value: string) {
  return value
    .replace(/^(\s*)(\d{1,3})\\\.(?=\s)/gm, "$1$2.")
    .replace(/^(\s*)\\([*+-])(?=\s)/gm, "$1$2")
    .replace(/\\\*\\\*/g, "**")
    .replace(/\\_\\_/g, "__");
}

function normalizeEscapedMathDelimiters(value: string) {
  return value.replace(/\\\\(\[|\]|\(|\))/g, "\\$1");
}

function removeNestedDollarDelimiters(expression: string) {
  return expression.replace(/(?<!\\)\${1,2}/g, "").trim();
}

function protectCurrencyDollars(value: string) {
  return value
    .replace(
      /(?<!\\)\$(\d[\d,]*(?:\.\d{1,2})?)(\s+(?:and|or|to|through)\s+)\$(?=\d)/gi,
      (_, amount: string, connector: string) => `\\$${amount}${connector}\\$`
    )
    .replace(
      /(\b(?:costs?|price(?:d)?|paid|pay|worth|spend|spent|save|saved|usd)\s+)(?<!\\)\$(?=\d)/gi,
      (_, context: string) => `${context}\\$`
    )
    .replace(
      /(?<!\\)\$(\d[\d,]*(?:\.\d{1,2})?)(?=\s*(?:dollars?|usd|each|per|only|[,.!?](?:\s|$)|$))/gi,
      (_, amount: string) => `\\$${amount}`
    );
}

function transformOutsideMath(
  value: string,
  transform: (segment: string) => string
) {
  return value
    .split(MATH_SEGMENT_PATTERN)
    .map((segment, index) => {
      if (index % 2 === 1) return segment;
      return transform(segment);
    })
    .join("");
}

function wrapBareGroupedCommands(value: string) {
  return GROUPED_LATEX_COMMAND_PATTERNS.reduce(
    (current, pattern) =>
      transformOutsideMath(current, (segment) =>
        segment.replace(pattern, (expression) => `$${expression}$`)
      ),
    value
  );
}

function wrapBareSymbolicCommands(value: string) {
  return transformOutsideMath(value, (segment) =>
    segment.replace(
      SIMPLE_LATEX_COMMAND_PATTERN,
      (_, command: string) => `$\\${command}$`
    )
  );
}

function normalizeTextSegment(value: string) {
  const withMarkdownDelimiters = protectCurrencyDollars(
    normalizeEscapedMathDelimiters(normalizeOverEscapedMarkdown(value))
  )
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, expression: string) =>
      `\n\n$$\n${removeNestedDollarDelimiters(expression)}\n$$\n\n`
    )
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, expression: string) =>
      `$${removeNestedDollarDelimiters(expression)}$`
    )
    // A truncated model response should remain readable instead of turning the
    // rest of the message into one invalid maths block.
    .replace(/\\[\[\]()]/g, "");

  return wrapBareSymbolicCommands(
    wrapBareGroupedCommands(withMarkdownDelimiters)
  );
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
