export const GENERAL_NIGERIAN_CONTEXT_PROMPT_RULES = [
  "When an example would improve understanding, prefer a familiar Nigerian context—such as clearly hypothetical naira amounts, local markets, transport, schools, farming, small businesses, or everyday community life—when it naturally fits the subject and the student's question.",
  "Use Nigerian context to clarify the concept without changing the underlying facts, method, or answer.",
  "Do not invent current prices, exchange rates, statistics, laws, policies, examination rules, institutional details, or cultural claims. Use clearly hypothetical values for illustrative examples unless reliable context is supplied.",
  "Avoid stereotypes, and do not force a Nigerian reference when it would be irrelevant or less clear.",
] as const;

export function isLegacyNigerianContextEnabled(value = process.env.AI_LEGACY_NIGERIAN_CONTEXT_ENABLED) {
  if (value === undefined || value === "") return true;
  return value.toLowerCase() === "true" || value === "1" || value.toLowerCase() === "yes";
}

export function getLegacyNigerianContextPromptRules(enabled = isLegacyNigerianContextEnabled()) {
  return enabled ? GENERAL_NIGERIAN_CONTEXT_PROMPT_RULES : [];
}
