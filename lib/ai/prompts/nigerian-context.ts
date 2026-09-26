export const GENERAL_NIGERIAN_CONTEXT_PROMPT_RULES = [
  "When an example would improve understanding, prefer a familiar Nigerian context—such as clearly hypothetical naira amounts, local markets, transport, schools, farming, small businesses, or everyday community life—when it naturally fits the subject and the student's question.",
  "Use Nigerian context to clarify the concept without changing the underlying facts, method, or answer.",
  "Do not invent current prices, exchange rates, statistics, laws, policies, examination rules, institutional details, or cultural claims. Use clearly hypothetical values for illustrative examples unless reliable context is supplied.",
  "Avoid stereotypes, and do not force a Nigerian reference when it would be irrelevant or less clear.",
] as const;

export const GROUNDED_NIGERIAN_CONTEXT_PROMPT_RULES = [
  "When the supplied evidence contains a relevant Nigerian example or context, prefer it over a generic example.",
  "Do not introduce Nigerian places, institutions, prices, laws, statistics, customs, or examples unless the evidence supporting the answer explicitly contains them.",
] as const;
