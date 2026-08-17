import type {
  ExtractRequestRequirementsInput,
  RequestContextMessage,
  RequestRequirement,
  RequestRequirements,
  RequestSafetyIntent,
  RequirementKind,
} from "./types";

const DEFAULT_CONTEXT_LIMIT = 6;
const SYMBOL_NAMES = new Set([
  "lambda",
  "rho",
  "theta",
  "alpha",
  "beta",
  "gamma",
  "pi",
  "delta",
]);

type RequirementDraft = {
  kind: RequirementKind;
  targetConcepts: string[];
  requiredSymbols?: string[];
  requiredInputs?: string[];
  comparisonSides?: string[];
  requestedRelation?: string;
  requestedProcess?: string;
  dependsOnPreviousTurn?: boolean;
  childRequirements?: RequirementDraft[];
};

type RequirementBuildContext = {
  subjectId: string;
  topicId?: string;
  contextConcept?: string;
  contextProcess?: string;
  dependsOnPreviousTurn: boolean;
};

export function extractRequestRequirements(
  input: ExtractRequestRequirementsInput
): RequestRequirements {
  const normalizedQuestion = normalizeQuestion(input.question);
  const quotedSegments = extractQuotedSegments(normalizedQuestion);
  const explicitQuotedTask = extractExplicitQuotedTask(normalizedQuestion, quotedSegments);
  const activeQuestion =
    explicitQuotedTask ?? removeNonTaskHostileQuotes(normalizedQuestion, quotedSegments);
  const context = resolveRecentContext(
    input.recentMessages ?? [],
    input.maxContextMessages ?? DEFAULT_CONTEXT_LIMIT
  );
  const currentHasExplicitConcept = hasExplicitCurrentConcept(activeQuestion);
  const shouldUseContext =
    !currentHasExplicitConcept &&
    isContextualFollowUp(activeQuestion) &&
    Boolean(context.concept || context.process);
  const drafts = buildRequirementDrafts(activeQuestion, {
    subjectId: input.subjectId,
    topicId: input.topicId,
    contextConcept: shouldUseContext ? context.concept : undefined,
    contextProcess: shouldUseContext ? context.process : undefined,
    dependsOnPreviousTurn: shouldUseContext,
  });

  return {
    requestId:
      input.requestId ??
      `request-${stableHash(`${input.subjectId}:${input.topicId ?? ""}:${normalizedQuestion}`)}`,
    normalizedQuestion,
    subjectId: input.subjectId,
    topicId: input.topicId,
    requirements: assignRequirementIds(drafts, input.subjectId, input.topicId),
    safetyIntent: buildSafetyIntent(activeQuestion, quotedSegments),
  };
}

export function normalizeQuestion(question: string): string {
  return question
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function buildRequirementDrafts(
  question: string,
  context: RequirementBuildContext
): RequirementDraft[] {
  const multiOption = buildMultiOptionRequirement(question);
  if (multiOption) return [withContext(multiOption, context)];

  const calculation = buildCalculationRequirement(question);
  if (calculation) return [withContext(calculation, context)];

  const comparison = buildComparisonRequirement(question);
  if (comparison) return [withContext(comparison, context)];

  const formulaWithSymbols = buildFormulaWithSymbolsRequirement(question, context);
  if (formulaWithSymbols) return [withContext(formulaWithSymbols, context)];

  const symbolDefinition = buildSymbolDefinitionRequirement(question);
  if (symbolDefinition) return [withContext(symbolDefinition, context)];

  const formula = buildFormulaRequirement(question, context);
  if (formula) return [withContext(formula, context)];

  const multiPart = buildMultiPartRequirement(question, context);
  if (multiPart) return [withContext(multiPart, context)];

  const relation = buildRelationRequirement(question);
  if (relation) return [withContext(relation, context)];

  const process = buildProcessRequirement(question, context);
  if (process) return [withContext(process, context)];

  const definition = buildDefinitionRequirement(question, context);
  if (definition) return [withContext(definition, context)];

  return [
    withContext(
      {
        kind: context.dependsOnPreviousTurn
          ? "CONTEXTUAL_FOLLOW_UP"
          : "CONCEPT_DEFINITION",
        targetConcepts: compactStrings([context.contextConcept]),
        requestedRelation: cleanConcept(question),
      },
      context
    ),
  ];
}

function buildMultiOptionRequirement(question: string): RequirementDraft | undefined {
  if (!/\b(which|choose|select|best|cheapest|cheaper|lowest|highest)\b/i.test(question)) {
    return undefined;
  }

  if (!/\b(two|three|four|options?|packs?|choices?|alternatives?)\b/i.test(question)) {
    return undefined;
  }

  const relation = firstMatch(question, /\b(cheaper per item|cheapest|best|lowest|highest|greater|smaller)\b/i);

  return {
    kind: "MULTI_OPTION_COMPARISON",
    targetConcepts: compactStrings([relation ?? "options"]),
    comparisonSides: inferOptionSides(question),
    requestedRelation: relation ?? cleanConcept(question),
  };
}

function buildCalculationRequirement(question: string): RequirementDraft | undefined {
  if (!/\b(calculate|work out|compute|determine|find)\b/i.test(question)) {
    return undefined;
  }

  const target =
    firstMatch(
      question,
      /\b(?:calculate|work out|compute|determine|find)\s+(?:the\s+)?(.+?)(?:\s+(?:from|when|if|given|using|where|with)\b|[?.]|$)/i
    ) ?? "";

  return {
    kind: "CALCULATION",
    targetConcepts: compactStrings([cleanConcept(target)]),
    requiredInputs: extractNumericInputs(question),
  };
}

function buildComparisonRequirement(question: string): RequirementDraft | undefined {
  const compareMatch =
    firstMatch(
      question,
      /\b(?:compare|distinguish|differentiate)\s+(.+?)\s+(?:and|with|from|vs\.?|versus)\s+(.+?)(?:[?.]|$)/i,
      "pair"
    ) ??
    firstMatch(
      question,
      /\b(?:difference|differences)\s+between\s+(.+?)\s+and\s+(.+?)(?:[?.]|$)/i,
      "pair"
    );

  if (!compareMatch) return undefined;

  const sides = compareMatch.map(cleanConcept);

  if (sides.length < 2) return undefined;

  return {
    kind: "COMPARISON",
    targetConcepts: sides,
    comparisonSides: sides,
  };
}

function buildFormulaWithSymbolsRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  if (!/\bformula\b/i.test(question)) return undefined;
  if (
    !/\b(define|meaning|means|mean|represent|represents|stands for|explain what|what .* stands for|what .* means)\b/i.test(
      question
    )
  ) {
    return undefined;
  }

  const symbols = extractRequestedSymbols(question);
  if (symbols.length === 0) return undefined;

  return {
    kind: "FORMULA_WITH_SYMBOLS",
    targetConcepts: compactStrings([extractFormulaConcept(question), context.contextConcept]),
    requiredSymbols: symbols,
  };
}

function buildFormulaRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  if (!/\bformula\b/i.test(question)) return undefined;

  return {
    kind: "FORMULA",
    targetConcepts: compactStrings([extractFormulaConcept(question), context.contextConcept]),
  };
}

function buildSymbolDefinitionRequirement(question: string): RequirementDraft | undefined {
  const symbol = extractPrimarySymbolRequest(question);
  if (!symbol) return undefined;

  return {
    kind: "SYMBOL_DEFINITION",
    targetConcepts: [],
    requiredSymbols: [symbol],
  };
}

function buildMultiPartRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  if (!/\b(state|list|name|give|mention)\b/i.test(question)) return undefined;
  if (!/\band\b/i.test(question)) return undefined;
  if (/\b(compare|calculate|formula)\b/i.test(question)) return undefined;

  const rustingTarget =
    firstMatch(question, /\bconditions?\s+for\s+(.+?)\s+and\b/i) ??
    firstMatch(question, /\b(.+?)\s+conditions?\s+and\b/i);
  if (rustingTarget && /\bprevent|prevention\b/i.test(question)) {
    const target = cleanConcept(rustingTarget);
    return {
      kind: "MULTI_PART",
      targetConcepts: compactStrings([target]),
      childRequirements: [
        {
          kind: "RELATION_MECHANISM_CONSEQUENCE",
          targetConcepts: compactStrings([target]),
          requestedRelation: `conditions for ${target}`,
        },
        {
          kind: "RELATION_MECHANISM_CONSEQUENCE",
          targetConcepts: compactStrings([target]),
          requestedRelation: `prevention method for ${target}`,
        },
      ],
    };
  }

  const parts = splitOnTopLevelAnd(question)
    .map((part) => cleanConcept(part.replace(/^\b(state|list|name|give|mention)\b/i, "")))
    .filter(Boolean);
  if (parts.length < 2) return undefined;

  return {
    kind: "MULTI_PART",
    targetConcepts: compactStrings(parts),
    childRequirements: parts.map((part) => ({
      kind: "CONCEPT_DEFINITION",
      targetConcepts: compactStrings([part, context.contextConcept]),
    })),
  };
}

function buildRelationRequirement(question: string): RequirementDraft | undefined {
  const affectMatch = question.match(
    /\bwhy\s+does\s+(.+?)\s+(affect|cause|lead to|change|increase|decrease)\s+(.+?)(?:[?.]|$)/i
  );
  if (affectMatch) {
    const cause = cleanConcept(affectMatch[1] ?? "");
    const relation = cleanConcept(affectMatch[2] ?? "");
    const target = cleanConcept(affectMatch[3] ?? "");
    return {
      kind: "RELATION_MECHANISM_CONSEQUENCE",
      targetConcepts: compactStrings([target, cause]),
      requestedRelation: compactStrings([cause, relation, target]).join(" "),
    };
  }

  const whyMatch = question.match(/\bwhy\s+(?:is|are|do|does|can)\s+(.+?)(?:[?.]|$)/i);
  if (!whyMatch) return undefined;

  const relation = cleanConcept(whyMatch[1] ?? "");
  return {
    kind: "RELATION_MECHANISM_CONSEQUENCE",
    targetConcepts: compactStrings([relation]),
    requestedRelation: relation,
  };
}

function buildProcessRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  const process =
    firstMatch(question, /\b(?:explain|describe)\s+(?:the\s+)?process\s+of\s+(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\b(?:explain|describe)\s+(.+?)(?:[?.]|$)/i);

  if (!process) return undefined;

  const cleaned = cleanConcept(process);
  if (/\b(formula|symbol|mean|represent)\b/i.test(cleaned)) return undefined;

  return {
    kind: "PROCESS_EXPLANATION",
    targetConcepts: compactStrings([cleaned, context.contextProcess]),
    requestedProcess: cleaned || context.contextProcess,
  };
}

function buildDefinitionRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  const concept =
    firstMatch(question, /\bwhat\s+(?:is|are)\s+(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\bdefine\s+(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\b(?:state|give)\s+(?:the\s+)?meaning\s+of\s+(.+?)(?:[?.]|$)/i);

  if (!concept && !context.contextConcept) return undefined;

  return {
    kind: "CONCEPT_DEFINITION",
    targetConcepts: compactStrings([cleanConcept(concept ?? ""), context.contextConcept]),
  };
}

function withContext(
  draft: RequirementDraft,
  context: RequirementBuildContext
): RequirementDraft {
  if (!context.dependsOnPreviousTurn) return draft;

  return {
    ...draft,
    dependsOnPreviousTurn: true,
    childRequirements: draft.childRequirements?.map((child) =>
      withContext(child, context)
    ),
  };
}

function assignRequirementIds(
  drafts: RequirementDraft[],
  subjectId: string,
  topicId?: string
): RequestRequirement[] {
  return drafts.map((draft, index) =>
    assignRequirementId(draft, `req-${index + 1}`, subjectId, topicId)
  );
}

function assignRequirementId(
  draft: RequirementDraft,
  id: string,
  subjectId: string,
  topicId?: string
): RequestRequirement {
  return {
    id,
    kind: draft.kind,
    subjectId,
    topicId,
    targetConcepts: uniqueStrings(draft.targetConcepts),
    requiredSymbols: optionalUnique(draft.requiredSymbols),
    requiredInputs: optionalUnique(draft.requiredInputs),
    comparisonSides: optionalUnique(draft.comparisonSides),
    requestedRelation: draft.requestedRelation,
    requestedProcess: draft.requestedProcess,
    dependsOnPreviousTurn: draft.dependsOnPreviousTurn || undefined,
    childRequirements: draft.childRequirements?.map((child, index) =>
      assignRequirementId(child, `${id}.${index + 1}`, subjectId, topicId)
    ),
  };
}

function buildSafetyIntent(activeQuestion: string, quotedSegments: string[]): RequestSafetyIntent {
  return {
    asksForCurrentExternalInfo: asksForCurrentExternalInfo(activeQuestion),
    containsHostileQuotedText: quotedSegments.some(isHostileInstruction),
    asksToIgnoreSources: asksToIgnoreSources(activeQuestion),
  };
}

function asksForCurrentExternalInfo(question: string): boolean {
  const lower = question.toLowerCase();
  if (/\belectric(?:ity)?\s+current\b|\bcurrent\s+(?:symbol|formula|flows?|in\s+a\s+circuit)\b/.test(lower)) {
    return false;
  }

  return /\b(latest|today|yesterday|tomorrow|this year|current(?:ly)?|up[- ]to[- ]date|real[- ]time|recent|news|deadline|registration|internet|online|web)\b/.test(
    lower
  );
}

function asksToIgnoreSources(question: string): boolean {
  return /\b(ignore|bypass|override|disregard)\b.{0,60}\b(source|evidence|citation|resource|context|instruction)s?\b/i.test(
    question
  ) || /\b(answer|use)\b.{0,40}\b(from memory|general knowledge|outside sources?)\b/i.test(question);
}

function isHostileInstruction(text: string): boolean {
  return asksToIgnoreSources(text) ||
    /\b(system prompt|developer message|hidden instruction|source limits?|do not cite|ignore all)\b/i.test(
      text
    );
}

function extractExplicitQuotedTask(
  question: string,
  quotedSegments: string[]
): string | undefined {
  if (quotedSegments.length === 0) return undefined;
  if (
    !/\b(solve|answer|calculate|work out|do)\b.{0,40}\b(question|problem|task|this)\b/i.test(
      question
    )
  ) {
    return undefined;
  }

  return normalizeQuestion(quotedSegments[0] ?? "");
}

function removeNonTaskHostileQuotes(question: string, quotedSegments: string[]) {
  let active = question;
  for (const segment of quotedSegments) {
    if (!isHostileInstruction(segment)) continue;
    active = active.replace(`"${segment}"`, "").replace(`'${segment}'`, "");
  }
  return normalizeQuestion(active);
}

function extractQuotedSegments(question: string): string[] {
  const segments: string[] = [];
  const quotedPattern = /"([^"]+)"|'([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = quotedPattern.exec(question)) !== null) {
    segments.push(normalizeQuestion(match[1] ?? match[2] ?? ""));
  }
  return segments;
}

function resolveRecentContext(messages: RequestContextMessage[], limit: number) {
  const bounded = messages.slice(-Math.max(0, limit));
  for (const message of [...bounded].reverse()) {
    if (message.role !== "USER") continue;
    const concept = extractLikelyConcept(message.content);
    if (concept) {
      return { concept, process: concept };
    }
  }

  return { concept: undefined, process: undefined };
}

function isContextualFollowUp(question: string): boolean {
  return /\b(it|its|that|this|this quantity|that quantity|that process|that formula)\b/i.test(
    question
  );
}

function hasExplicitCurrentConcept(question: string): boolean {
  const lower = question.toLowerCase();
  if (/\b(it|its|that|this|this quantity|that quantity|that process|that formula)\b/.test(lower)) {
    return false;
  }

  return Boolean(
    extractFormulaConcept(question) ||
      extractPrimarySymbolRequest(question) ||
      extractLikelyConcept(question)
  );
}

function extractLikelyConcept(question: string): string | undefined {
  const normalized = normalizeQuestion(question);
  const candidates = [
    firstMatch(normalized, /\bwhat\s+(?:is|are)\s+(.+?)(?:[?.]|$)/i),
    firstMatch(normalized, /\bdefine\s+(.+?)(?:[?.]|$)/i),
    firstMatch(normalized, /\bformula\s+(?:for|of)\s+(.+?)(?:[?.]|$)/i),
    firstMatch(normalized, /\b(.+?)\s+formula(?:[?.]|$)/i),
    firstMatch(normalized, /\b(?:explain|describe)\s+(?:the\s+process\s+of\s+)?(.+?)(?:[?.]|$)/i),
  ];

  return compactStrings(candidates.map((candidate) => cleanConcept(candidate ?? "")))[0];
}

function extractFormulaConcept(question: string): string {
  const direct =
    firstMatch(question, /\bformula\s+(?:for|of)\s+(.+?)(?:\s+and\b|[?.]|$)/i) ??
    firstMatch(question, /\b(?:give|state|write|what\s+is)\s+(?:the\s+)?(.+?)\s+formula(?:\s+and\b|[?.]|$)/i);

  return cleanConcept(direct ?? "");
}

function extractPrimarySymbolRequest(question: string): string | undefined {
  const patterns = [
    /\bwhat\s+does\s+([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)\s+(?:mean|represent|stand for)\b/i,
    /\bwhat\s+is\s+([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)\s+in\s+(?:the\s+)?formula\b/i,
    /\bidentify\s+([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)\b/i,
    /\bstate\s+what\s+([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)\s+(?:means|represents|stands for)\b/i,
    /\bdefine\s+([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)(?:[?.]|$)/i,
    /\bwhat\s+is\s+([A-Za-z\u0370-\u03ff])(?:[?.]|$)/i,
  ];

  for (const pattern of patterns) {
    const symbol = firstMatch(question, pattern);
    if (symbol && isSymbolToken(symbol)) return symbol;
  }

  return undefined;
}

function extractRequestedSymbols(question: string): string[] {
  const symbols = new Set<string>();
  const symbolClauses = [
    ...question.matchAll(/\bdefine\s+(.+?)(?:[?.]|$)/gi),
    ...question.matchAll(/\bexplain\s+what\s+(.+?)\s+(?:means?|represents?|stands for)(?:[?.]|$)/gi),
    ...question.matchAll(/\bwhat\s+(.+?)\s+(?:means?|represents?|stands for)(?:[?.]|$)/gi),
  ];

  for (const clause of symbolClauses) {
    const raw = clause[1] ?? "";
    for (const token of raw.split(/\s*(?:,|and|&)\s*/i)) {
      const cleaned = cleanSymbolToken(token);
      if (cleaned && isSymbolToken(cleaned)) symbols.add(cleaned);
    }
  }

  const primary = extractPrimarySymbolRequest(question);
  if (primary) symbols.add(primary);

  return [...symbols];
}

function extractNumericInputs(question: string): string[] {
  const inputs = new Set<string>();
  for (const match of question.matchAll(/\b[A-Za-z]\s*=\s*[-+]?\d+(?:\.\d+)?\s*[A-Za-z0-9/^²³%]*\b/g)) {
    inputs.add(normalizeQuestion(match[0] ?? ""));
  }
  for (const match of question.matchAll(/\b[-+]?\d+(?:\.\d+)?\s*[A-Za-z]+(?:\/[A-Za-z]+)?\b/g)) {
    inputs.add(normalizeQuestion(match[0] ?? ""));
  }
  return [...inputs];
}

function splitOnTopLevelAnd(question: string): string[] {
  return question.split(/\s+and\s+/i).map(normalizeQuestion);
}

function inferOptionSides(question: string): string[] {
  const explicit = [...question.matchAll(/\b(pack|option|choice)\s*([A-Za-z0-9]+)\b/gi)]
    .map((match) => `${(match[1] ?? "option").toLowerCase()} ${match[2] ?? ""}`.trim());
  if (explicit.length >= 2) return uniqueStrings(explicit);
  if (/\btwo\b/i.test(question)) return ["option 1", "option 2"];
  if (/\bthree\b/i.test(question)) return ["option 1", "option 2", "option 3"];
  return ["option 1", "option 2"];
}

function firstMatch(value: string, pattern: RegExp): string | undefined;
function firstMatch(value: string, pattern: RegExp, mode: "pair"): string[] | undefined;
function firstMatch(
  value: string,
  pattern: RegExp,
  mode?: "pair"
): string | string[] | undefined {
  const match = value.match(pattern);
  if (!match) return undefined;
  if (mode === "pair") {
    return compactStrings([match[1], match[2]].map((item) => item ?? ""));
  }
  return match[1];
}

function cleanConcept(value: string): string {
  const cleaned = normalizeQuestion(value)
    .replace(/[?.!]+$/g, "")
    .replace(/^(?:a|an|the|this|that|its)\s+/i, "")
    .replace(/\b(?:formula|process|method|rule|conditions?|ways?|one|two|three)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return /^(?:it|its|that|this|this quantity|that quantity|that process|that formula)$/.test(
    cleaned
  )
    ? ""
    : cleaned;
}

function cleanSymbolToken(value: string): string {
  return normalizeQuestion(value)
    .replace(/[?.!,;:]+$/g, "")
    .replace(/^(?:the|a|an)\s+/i, "")
    .trim();
}

function isSymbolToken(value: string): boolean {
  const cleaned = cleanSymbolToken(value);
  if (SYMBOL_NAMES.has(cleaned.toLowerCase())) return true;
  return /^[A-Za-z\u0370-\u03ff]{1,2}$/.test(cleaned);
}

function compactStrings(values: Array<string | undefined>): string[] {
  return values
    .map((value) => normalizeQuestion(value ?? ""))
    .filter((value) => value.length > 0);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(normalizeQuestion).filter(Boolean))];
}

function optionalUnique(values: string[] | undefined): string[] | undefined {
  if (!values) return undefined;
  const unique = uniqueStrings(values);
  return unique.length > 0 ? unique : undefined;
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
