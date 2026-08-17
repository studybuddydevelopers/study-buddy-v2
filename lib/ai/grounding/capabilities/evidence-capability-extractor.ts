import type {
  AuthorizedEvidenceChunk,
  CanonicalConcept,
  CapabilityConfidence,
  CapabilityFact,
  CapabilityPolarity,
  ComparisonSideCapability,
  ConflictCapability,
  ConflictType,
  ConsequenceCapability,
  EvidenceCapability,
  EvidenceSpan,
  ExtractEvidenceCapabilitiesInput,
  FormulaCapability,
  NumericCapability,
  ProcessCapability,
  RelationCapability,
  SymbolCapability,
  SymbolReference,
  UnsafeContentCapability,
  UnsafeContentType,
} from "./types";

type SentenceSpan = EvidenceSpan;

type ConceptAliasEntry = {
  id: string;
  label: string;
  aliases: string[];
  subjectIds?: string[];
  topicIds?: string[];
};

const CONTROLLED_CONCEPTS: ConceptAliasEntry[] = [
  {
    id: "simple-interest",
    label: "Simple interest",
    aliases: ["simple interest", "simple-interest", "si"],
  },
  { id: "density", label: "Density", aliases: ["density"] },
  { id: "speed", label: "Speed", aliases: ["speed"] },
  { id: "pressure", label: "Pressure", aliases: ["pressure"] },
  { id: "voltage", label: "Voltage", aliases: ["voltage", "potential difference"] },
  { id: "resistance", label: "Resistance", aliases: ["resistance"] },
  { id: "frequency", label: "Frequency", aliases: ["frequency"] },
  { id: "wavelength", label: "Wavelength", aliases: ["wavelength"] },
  { id: "evaporation", label: "Evaporation", aliases: ["evaporation"] },
  { id: "boiling", label: "Boiling", aliases: ["boiling"] },
  { id: "filtration", label: "Filtration", aliases: ["filtration"] },
  { id: "photosynthesis", label: "Photosynthesis", aliases: ["photosynthesis"] },
  { id: "acid", label: "Acid", aliases: ["acid", "acids"] },
  { id: "base", label: "Base", aliases: ["base", "bases", "alkali", "alkalis"] },
  { id: "osmosis", label: "Osmosis", aliases: ["osmosis"] },
  { id: "ratio", label: "Ratio", aliases: ["ratio", "ratios"] },
  { id: "ohms-law", label: "Ohm's law", aliases: ["ohm's law", "ohms law"] },
  { id: "conductor", label: "Conductor", aliases: ["conductor", "conductors"] },
  { id: "insulator", label: "Insulator", aliases: ["insulator", "insulators"] },
  {
    id: "series-resistance-rule",
    label: "Series resistance rule",
    aliases: ["series resistance rule", "series resistance rules", "series rules"],
  },
  {
    id: "parallel-resistance-rule",
    label: "Parallel resistance rule",
    aliases: ["parallel resistance rule", "parallel resistance rules", "parallel rules"],
  },
  { id: "noun", label: "Noun", aliases: ["noun", "nouns"] },
  { id: "median", label: "Median", aliases: ["median"] },
  { id: "rusting", label: "Rusting", aliases: ["rusting"] },
];

const GREEK_SYMBOLS = new Map<string, string>([
  ["lambda", "λ"],
  ["λ", "λ"],
  ["rho", "ρ"],
  ["ρ", "ρ"],
  ["theta", "θ"],
  ["θ", "θ"],
  ["alpha", "α"],
  ["α", "α"],
  ["beta", "β"],
  ["β", "β"],
  ["gamma", "γ"],
  ["γ", "γ"],
  ["pi", "π"],
  ["π", "π"],
  ["delta", "δ"],
  ["δ", "δ"],
]);

const UNSAFE_PATTERNS: Array<{ type: UnsafeContentType; pattern: RegExp }> = [
  {
    type: "PROMPT_INJECTION",
    pattern: /\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?\b/i,
  },
  {
    type: "BYPASS_REQUEST",
    pattern: /\banswer\s+(?:using|from)\s+(?:your\s+own\s+)?(?:memory|general knowledge)\b/i,
  },
  {
    type: "SECRET_REQUEST",
    pattern: /\breveal\s+(?:the\s+)?(?:system prompt|developer message|hidden instruction)s?\b/i,
  },
  {
    type: "SOURCE_MANIPULATION",
    pattern: /\b(?:use|cite)\s+source[_\s-]*\d+\b/i,
  },
];

export function extractEvidenceCapabilities(
  input: ExtractEvidenceCapabilitiesInput
): EvidenceCapability[] {
  return input.chunks.map(extractEvidenceCapability);
}

export function extractEvidenceCapability(chunk: AuthorizedEvidenceChunk): EvidenceCapability {
  const capability: EvidenceCapability = {
    resourceChunkId: chunk.resourceChunkId,
    sourceLabel: chunk.sourceLabel,
    subjectId: chunk.subjectId,
    topicId: chunk.topicId,
    conceptDefinitions: [],
    formulas: [],
    symbolDefinitions: [],
    numericValues: [],
    relations: [],
    comparisonSides: [],
    processFacts: [],
    consequences: [],
    conflicts: [],
    unsafeContent: [],
  };

  const state = createCapabilityState(chunk);
  for (const sentence of splitSentences(chunk.content)) {
    const unsafe = extractUnsafeContent(sentence, state);
    capability.unsafeContent?.push(...unsafe);
    if (unsafe.length > 0 && isUnsafeOnlySentence(sentence.text)) {
      continue;
    }

    const formulaSymbolDefinitions = extractSymbolDefinitions(sentence, state);
    const formulas = extractFormulas(sentence, state, formulaSymbolDefinitions);
    capability.formulas.push(...formulas);
    capability.symbolDefinitions.push(...formulaSymbolDefinitions);

    const symbolDefinitions = extractSymbolDefinitions(sentence, state).filter(
      (candidate) =>
        !formulaSymbolDefinitions.some(
          (existing) =>
            existing.symbol.normalized === candidate.symbol.normalized &&
            existing.evidenceSpan.startOffset === candidate.evidenceSpan.startOffset
        )
    );
    capability.symbolDefinitions.push(...symbolDefinitions);

    capability.conceptDefinitions.push(...extractConceptDefinitions(sentence, state));
    capability.numericValues.push(...extractNumericValues(sentence, state));
    capability.relations.push(...extractRelations(sentence, state));
    capability.comparisonSides.push(...extractComparisonSides(sentence, state));
    capability.processFacts.push(...extractProcessFacts(sentence, state));
    capability.consequences.push(...extractConsequences(sentence, state));
  }

  if (capability.unsafeContent && capability.unsafeContent.length === 0) {
    delete capability.unsafeContent;
  }

  return capability;
}

export function detectCapabilityConflicts(
  capabilities: EvidenceCapability[]
): ConflictCapability[] {
  const candidates = [
    ...detectDefinitionConflicts(capabilities),
    ...detectFormulaConflicts(capabilities),
    ...detectNumericConflicts(capabilities),
    ...detectRelationConflicts(capabilities),
  ];

  return candidates.map((candidate, index) => ({
    ...candidate,
    id: `conflict-${index + 1}`,
  }));
}

export function canonicalizeConcept(
  rawConcept: string,
  scope?: { subjectId?: string; topicId?: string }
): CanonicalConcept {
  const normalized = singularizeConcept(normalizeConceptText(rawConcept));
  const match = CONTROLLED_CONCEPTS.find((entry) => {
    const subjectMatches =
      !entry.subjectIds || !scope?.subjectId || entry.subjectIds.includes(scope.subjectId);
    const topicMatches =
      !entry.topicIds || !scope?.topicId || entry.topicIds.includes(scope.topicId);
    return (
      subjectMatches &&
      topicMatches &&
      entry.aliases.some((alias) => singularizeConcept(normalizeConceptText(alias)) === normalized)
    );
  });

  if (match) {
    return {
      id: match.id,
      label: match.label,
      aliases: match.aliases,
    };
  }

  return {
    id: `concept:${slugify(normalized || "unknown")}`,
    label: toTitleCase(normalized || rawConcept),
    aliases: normalized ? [normalized] : [],
  };
}

export function normalizeSymbol(rawSymbol: string): SymbolReference | undefined {
  const display = rawSymbol.trim().replace(/[.,;:!?]+$/g, "");
  if (!display) return undefined;
  const lowered = display.toLowerCase();
  const greek = GREEK_SYMBOLS.get(lowered) ?? GREEK_SYMBOLS.get(display);
  if (greek) return { display, normalized: greek };
  if (/^[A-Za-z](?:[_-]?[A-Za-z0-9]+|\d+|[¹²³])?$/.test(display)) {
    return { display, normalized: display.toLowerCase() };
  }
  return undefined;
}

function extractConceptDefinitions(
  sentence: SentenceSpan,
  state: CapabilityState
): CapabilityFact[] {
  const text = sentence.text;
  const absentMatch =
    text.match(/^(?:no\s+)?definition\s+of\s+(.+?)\s+(?:is\s+)?(?:not\s+)?(?:given|provided|stated|defined)(?:\s+here)?$/i) ??
    text.match(/^(.+?)\s+is\s+not\s+(?:defined|given|provided|stated|explained)(?:\s+here)?$/i);
  if (absentMatch) {
    const concept = cleanConcept(absentMatch[1] ?? "");
    return [
      createConceptDefinition({
        state,
        span: sentence,
        concept,
        definitionText: text,
        polarity: /not|no\s+definition/i.test(text) ? "NEGATED" : "ABSENT",
        confidence: "HIGH",
      }),
    ];
  }

  const definitionMatch =
    text.match(/^(?:(?:an|a|the)\s+)?(.+?)\s+(?:is|are|means|refers to)\s+(.+)$/i) ??
    text.match(/^(?:(?:an|a|the)\s+)?(.+?)\s+(shows?)\s+how\s+(.+)$/i) ??
    text.match(/^(?:(?:an|a|the)\s+)?(.+?)\s+(compares|describes)\s+(.+)$/i);
  if (!definitionMatch) return [];
  if (isFormulaLike(text) || isSymbolDefinitionSentence(text)) return [];

  const concept = cleanConcept(definitionMatch[1] ?? "");
  const definitionText =
    definitionMatch.length >= 4
      ? `${definitionMatch[2] ?? ""} ${definitionMatch[3] ?? ""}`.trim()
      : definitionMatch[2] ?? "";

  if (!concept || /\bnot\b/i.test(definitionText)) return [];

  return [
    createConceptDefinition({
      state,
      span: sentence,
      concept,
      definitionText,
      polarity: "POSITIVE",
      confidence: "HIGH",
    }),
  ];
}

function extractFormulas(
  sentence: SentenceSpan,
  state: CapabilityState,
  localSymbolDefinitions: SymbolCapability[]
): FormulaCapability[] {
  const formulas: FormulaCapability[] = [];
  const formulaPattern =
    /\b([A-Za-z\u0370-\u03ff][A-Za-z0-9_\u0370-\u03ff]*|[A-Za-z][A-Za-z ]{1,40}?)\s*=\s*([^.;]+?)(?=,?\s+where\b|[.;]|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = formulaPattern.exec(sentence.text)) !== null) {
    const left = normalizeFormulaLeft(match[1] ?? "");
    const right = normalizeFormulaSide(match[2] ?? "");
    if (!left || !right || !isFormulaRightSide(right)) continue;

    const expression = `${left} = ${right}`;
    const symbols = extractFormulaSymbols(expression);
    const inferredConcept = inferFormulaConcept(sentence.text, match.index, left, state);
    formulas.push({
      id: nextCapabilityId(state, "formula"),
      resourceChunkId: state.chunk.resourceChunkId,
      sourceLabel: state.chunk.sourceLabel,
      evidenceSpan: sliceSentenceSpan(sentence, match.index, match[0].length),
      confidence: "HIGH",
      canonicalConcept: canonicalizeFormulaConcept(left, state) ?? inferredConcept,
      expression,
      normalizedExpression: normalizeFormulaExpression(expression),
      outputQuantity: normalizeFormulaOutput(left),
      symbols,
      symbolDefinitions: localSymbolDefinitions.filter((definition) =>
        symbols.some((symbol) => symbol.normalized === definition.symbol.normalized)
      ),
      requiredInputs: symbols
        .filter((symbol) => symbol.normalized !== normalizeSymbol(left)?.normalized)
        .map((symbol) => symbol.normalized),
    });
  }

  return formulas;
}

function extractSymbolDefinitions(
  sentence: SentenceSpan,
  state: CapabilityState
): SymbolCapability[] {
  const definitions: SymbolCapability[] = [];
  const seen = new Set<string>();
  const patterns: RegExp[] = [
    /\b([A-Za-z\u0370-\u03ff][A-Za-z0-9_\u0370-\u03ff]*|lambda|rho|theta|alpha|beta|gamma|pi|delta|[λρθαβγπδ])\s+(means|represents|denotes|stands for|is)\s+([^,.;]+)(?=[,.;]|$)/gi,
    /([λρθαβγπδ])\s+(means|represents|denotes|stands for|is)\s+([^,.;]+)(?=[,.;]|$)/gi,
    /\bwhere\s+([A-Za-z\u0370-\u03ff][A-Za-z0-9_\u0370-\u03ff]*|lambda|rho|theta|alpha|beta|gamma|pi|delta|[λρθαβγπδ])\s+(?:means|represents|denotes|stands for|is)\s+([^,.;]+)(?=[,.;]|$)/gi,
    /\b([A-Za-z\u0370-\u03ff][A-Za-z0-9_\u0370-\u03ff]*|lambda|rho|theta|alpha|beta|gamma|pi|delta|[λρθαβγπδ])\s*=\s*([A-Za-z][A-Za-z ]{2,40})(?=[,.;]|$)/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(sentence.text)) !== null) {
      const rawSymbol = match[1] ?? "";
      const symbol = normalizeSymbol(rawSymbol);
      if (!symbol) continue;

      const meaning =
        pattern.source.includes("where\\s+")
          ? match[2] ?? ""
          : pattern.source.includes("\\s*=\\s*")
            ? match[2] ?? ""
            : match[3] ?? "";
      if (!meaning || isFormulaRightSide(meaning) || /^not\s+(?:defined|given|provided|stated)/i.test(meaning)) {
        continue;
      }

      const key = `${symbol.normalized}:${cleanMeaning(meaning).toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      definitions.push(
        createSymbolDefinition({
          state,
          span: sliceSentenceSpan(sentence, match.index, match[0].length),
          symbol,
          meaning: cleanMeaning(meaning),
          polarity: "POSITIVE",
        })
      );
    }
  }

  const negated = sentence.text.match(
    /\b([A-Za-z\u0370-\u03ff][A-Za-z0-9_\u0370-\u03ff]*|lambda|rho|theta|alpha|beta|gamma|pi|delta|[λρθαβγπδ])\s+is\s+not\s+defined\b/i
  );
  if (negated) {
    const symbol = normalizeSymbol(negated[1] ?? "");
    if (symbol) {
      definitions.push(
        createSymbolDefinition({
          state,
          span: sentence,
          symbol,
          meaning: undefined,
          polarity: "NEGATED",
        })
      );
    }
  }

  return definitions;
}

function extractNumericValues(
  sentence: SentenceSpan,
  state: CapabilityState
): NumericCapability[] {
  const values: NumericCapability[] = [];
  const qualified = sentence.text.match(
    /\b(?:the\s+)?([A-Za-z][A-Za-z ]{1,40}?)\s+(?:across|in|of|for)\s+(?:the\s+)?([A-Za-z][A-Za-z ]{1,40}?)\s+is\s+([-+]?\d+(?:\.\d+)?)\s*([A-Za-z%/²³]+)\b/i
  );
  if (qualified) {
    values.push(
      createNumericValue({
        state,
        span: sentence,
        quantity: cleanConcept(qualified[1] ?? ""),
        qualifier: cleanConcept(qualified[2] ?? ""),
        value: Number(qualified[3]),
        unit: qualified[4],
      })
    );
    return values;
  }

  const direct = sentence.text.match(
    /\b(?:the\s+)?([A-Za-z][A-Za-z ]{1,40}?)\s+is\s+([-+]?\d+(?:\.\d+)?)\s*([A-Za-z%/²³]+)\b/i
  );
  if (direct && !isDefinitionVerbContext(sentence.text)) {
    values.push(
      createNumericValue({
        state,
        span: sentence,
        quantity: cleanConcept(direct[1] ?? ""),
        value: Number(direct[2]),
        unit: direct[3],
      })
    );
  }

  if (isCalculationLikeSentence(sentence.text)) {
    const seen = new Set(values.map((item) => `${item.value}:${item.unit ?? ""}`));
    for (const match of sentence.text.matchAll(/\b([-+]?\d+(?:\.\d+)?)\s*(percent|%|[A-Za-z/²³]+)?\b/gi)) {
      const value = Number(match[1]);
      const unit = normalizeUnit(match[2]);
      const spanLength = unit || !match[2] ? match[0].length : (match[1] ?? "").length;
      const key = `${value}:${unit ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(
        createNumericValue({
          state,
          span: sliceSentenceSpan(sentence, match.index ?? 0, spanLength),
          quantity: inferNumericQuantity(sentence.text, match.index ?? 0, unit),
          value,
          unit,
        })
      );
    }
  }

  return values;
}

function extractRelations(
  sentence: SentenceSpan,
  state: CapabilityState
): RelationCapability[] {
  const relationMatch =
    sentence.text.match(/\b(.+?)\s+(increases|decreases|reduces|affects|causes|depends on|leads to)\s+(.+)$/i) ??
    sentence.text.match(/\b(.+?)\s+(carry|carries|transport|transports)\s+(.+)$/i) ??
    sentence.text.match(/\b(.+?)\s+(increases|decreases)\s+with\s+(.+)$/i);
  if (!relationMatch) return [];

  const subject = cleanConcept(relationMatch[1] ?? "");
  const relation = normalizeRelation(relationMatch[2] ?? "");
  const object = cleanConcept(relationMatch[3] ?? "");
  if (!subject || !relation || !object) return [];

  return [
    {
      id: nextCapabilityId(state, "relation"),
      resourceChunkId: state.chunk.resourceChunkId,
      sourceLabel: state.chunk.sourceLabel,
      evidenceSpan: sentence,
      confidence: "HIGH",
      subject,
      relation,
      object,
      polarity: /\b(?:does not|do not|not|never)\b/i.test(sentence.text)
        ? "NEGATED"
        : "POSITIVE",
    },
  ];
}

function extractComparisonSides(
  sentence: SentenceSpan,
  state: CapabilityState
): ComparisonSideCapability[] {
  const occurrence = sentence.text.match(/\b(.+?)\s+(?:occurs|happens|takes place)\s+(.+)$/i);
  if (occurrence) {
    return createComparisonSide({
      state,
      sentence,
      side: cleanConcept(occurrence[1] ?? ""),
      fact: cleanMeaning(occurrence[2] ?? ""),
    });
  }

  const allow = sentence.text.match(
    /\b(?:an|a|the)?\s*(.+?)\s+(allows?|does not allow|do not allow)\s+(.+)$/i
  );
  if (allow) {
    return createComparisonSide({
      state,
      sentence,
      side: cleanConcept(allow[1] ?? ""),
      fact: cleanMeaning(`${allow[2] ?? ""} ${allow[3] ?? ""}`.trim()),
    });
  }

  const has = isFormulaLike(sentence.text)
    ? null
    : sentence.text.match(/\b(?:an|a|the)?\s*(.+?)\s+(has|have)\s+(.+)$/i);
  if (!has) return [];

  return createComparisonSide({
    state,
    sentence,
    side: cleanConcept(has[1] ?? ""),
    fact: cleanMeaning(`${has[2] ?? ""} ${has[3] ?? ""}`.trim()),
  });
}

function createComparisonSide(input: {
  state: CapabilityState;
  sentence: SentenceSpan;
  side: string;
  fact: string;
}): ComparisonSideCapability[] {
  const side = input.side;
  const fact = input.fact;
  if (!side || !fact) return [];

  return [
    {
      id: nextCapabilityId(input.state, "comparison"),
      resourceChunkId: input.state.chunk.resourceChunkId,
      sourceLabel: input.state.chunk.sourceLabel,
      evidenceSpan: input.sentence,
      confidence: "HIGH",
      side,
      fact,
      polarity: "POSITIVE",
    },
  ];
}

function extractProcessFacts(
  sentence: SentenceSpan,
  state: CapabilityState
): ProcessCapability[] {
  const match =
    sentence.text.match(/\b(.+?)\s+uses\s+(.+?)\s+to\s+(.+)$/i) ??
    sentence.text.match(/\b(.+?)\s+separates\s+(.+)$/i);
  if (!match) return [];

  const process = cleanConcept(match[1] ?? "");
  if (!process) return [];

  return [
    {
      id: nextCapabilityId(state, "process"),
      resourceChunkId: state.chunk.resourceChunkId,
      sourceLabel: state.chunk.sourceLabel,
      evidenceSpan: sentence,
      confidence: "HIGH",
      process,
      fact: cleanMeaning(sentence.text),
    },
  ];
}

function extractConsequences(
  sentence: SentenceSpan,
  state: CapabilityState
): ConsequenceCapability[] {
  const match = sentence.text.match(/\b(.+?)\s+(reduces|increases|causes|leads to)\s+(.+)$/i);
  if (!match) return [];

  const cause = cleanConcept(match[1] ?? "");
  const effect = `${normalizeRelation(match[2] ?? "")} ${cleanConcept(match[3] ?? "")}`.trim();
  if (!cause || !effect) return [];

  return [
    {
      id: nextCapabilityId(state, "consequence"),
      resourceChunkId: state.chunk.resourceChunkId,
      sourceLabel: state.chunk.sourceLabel,
      evidenceSpan: sentence,
      confidence: "HIGH",
      cause,
      effect,
      polarity: /\bnot\b/i.test(sentence.text) ? "NEGATED" : "POSITIVE",
    },
  ];
}

function extractUnsafeContent(
  sentence: SentenceSpan,
  state: CapabilityState
): UnsafeContentCapability[] {
  const unsafe: UnsafeContentCapability[] = [];
  for (const item of UNSAFE_PATTERNS) {
    const match = sentence.text.match(item.pattern);
    if (!match) continue;
    unsafe.push({
      id: nextCapabilityId(state, "unsafe"),
      resourceChunkId: state.chunk.resourceChunkId,
      sourceLabel: state.chunk.sourceLabel,
      evidenceSpan: sliceSentenceSpan(sentence, match.index ?? 0, match[0].length),
      confidence: "HIGH",
      unsafeType: item.type,
      matchedText: match[0],
    });
  }
  return unsafe;
}

function detectDefinitionConflicts(
  capabilities: EvidenceCapability[]
): Array<Omit<ConflictCapability, "id">> {
  const grouped = new Map<string, CapabilityFact[]>();
  for (const capability of capabilities) {
    for (const definition of capability.conceptDefinitions) {
      if (definition.polarity !== "POSITIVE") continue;
      const key = `definition:${definition.canonicalConcept.id}`;
      grouped.set(key, [...(grouped.get(key) ?? []), definition]);
    }
  }

  return buildPairwiseConflicts(grouped, "DEFINITION_CONFLICT", (left, right) =>
    normalizedMeaning(left.definitionText) !== normalizedMeaning(right.definitionText)
  );
}

function detectFormulaConflicts(
  capabilities: EvidenceCapability[]
): Array<Omit<ConflictCapability, "id">> {
  const grouped = new Map<string, FormulaCapability[]>();
  for (const capability of capabilities) {
    for (const formula of capability.formulas) {
      const scope = compactStrings([
        formula.canonicalConcept?.id,
        formula.outputQuantity,
      ]).join(":") || "unknown";
      const key = `formula:${scope}`;
      grouped.set(key, [...(grouped.get(key) ?? []), formula]);
    }
  }

  return buildPairwiseConflicts(grouped, "FORMULA_CONFLICT", (left, right) =>
    left.normalizedExpression !== right.normalizedExpression
  );
}

function detectNumericConflicts(
  capabilities: EvidenceCapability[]
): Array<Omit<ConflictCapability, "id">> {
  const grouped = new Map<string, NumericCapability[]>();
  for (const capability of capabilities) {
    for (const numeric of capability.numericValues) {
      const key = `numeric:${numeric.quantity}:${numeric.qualifier ?? ""}:${numeric.unit ?? ""}`;
      grouped.set(key, [...(grouped.get(key) ?? []), numeric]);
    }
  }

  return buildPairwiseConflicts(grouped, "NUMERIC_VALUE_CONFLICT", (left, right) =>
    left.value !== right.value
  );
}

function detectRelationConflicts(
  capabilities: EvidenceCapability[]
): Array<Omit<ConflictCapability, "id">> {
  const grouped = new Map<string, RelationCapability[]>();
  for (const capability of capabilities) {
    for (const relation of capability.relations) {
      const key = `relation:${relation.subject}:${relation.relation}`;
      grouped.set(key, [...(grouped.get(key) ?? []), relation]);
    }
  }

  return buildPairwiseConflicts(grouped, "RELATION_CONFLICT", (left, right) =>
    left.object !== right.object || left.polarity !== right.polarity
  );
}

function buildPairwiseConflicts<T extends ConflictCandidate>(
  grouped: Map<string, T[]>,
  conflictType: ConflictType,
  isConflict: (left: T, right: T) => boolean
): Array<Omit<ConflictCapability, "id">> {
  const conflicts: Array<Omit<ConflictCapability, "id">> = [];
  for (const [scopeKey, items] of grouped) {
    for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
        const left = items[leftIndex]!;
        const right = items[rightIndex]!;
        if (!isConflict(left, right)) continue;
        conflicts.push({
          scopeKey,
          conflictType,
          conflictingCapabilityIds: [left.id, right.id],
          resourceChunkIds: uniqueStrings([left.resourceChunkId, right.resourceChunkId]),
          sourceLabels: uniqueStrings([left.sourceLabel, right.sourceLabel]),
          evidenceSpans: [left.evidenceSpan, right.evidenceSpan],
        });
      }
    }
  }
  return conflicts;
}

type ConflictCandidate = {
  id: string;
  resourceChunkId: string;
  sourceLabel: string;
  evidenceSpan: EvidenceSpan;
};

type CapabilityState = {
  chunk: AuthorizedEvidenceChunk;
  sequence: number;
};

function createCapabilityState(chunk: AuthorizedEvidenceChunk): CapabilityState {
  return { chunk, sequence: 0 };
}

function nextCapabilityId(state: CapabilityState, prefix: string): string {
  state.sequence += 1;
  return `${state.chunk.resourceChunkId}:${prefix}-${state.sequence}`;
}

function createConceptDefinition(input: {
  state: CapabilityState;
  span: EvidenceSpan;
  concept: string;
  definitionText: string;
  polarity: CapabilityPolarity;
  confidence: CapabilityConfidence;
}): CapabilityFact {
  return {
    id: nextCapabilityId(input.state, "definition"),
    resourceChunkId: input.state.chunk.resourceChunkId,
    sourceLabel: input.state.chunk.sourceLabel,
    evidenceSpan: input.span,
    confidence: input.confidence,
    canonicalConcept: canonicalizeConcept(input.concept, input.state.chunk),
    definitionText: cleanMeaning(input.definitionText),
    polarity: input.polarity,
  };
}

function createSymbolDefinition(input: {
  state: CapabilityState;
  span: EvidenceSpan;
  symbol: SymbolReference;
  meaning?: string;
  polarity: CapabilityPolarity;
}): SymbolCapability {
  return {
    id: nextCapabilityId(input.state, "symbol"),
    resourceChunkId: input.state.chunk.resourceChunkId,
    sourceLabel: input.state.chunk.sourceLabel,
    evidenceSpan: input.span,
    confidence: "HIGH",
    symbol: input.symbol,
    meaning: input.meaning,
    canonicalConcept: input.meaning
      ? canonicalizeConcept(input.meaning, input.state.chunk)
      : undefined,
    polarity: input.polarity,
  };
}

function createNumericValue(input: {
  state: CapabilityState;
  span: EvidenceSpan;
  quantity: string;
  value: number;
  unit?: string;
  qualifier?: string;
}): NumericCapability {
  return {
    id: nextCapabilityId(input.state, "numeric"),
    resourceChunkId: input.state.chunk.resourceChunkId,
    sourceLabel: input.state.chunk.sourceLabel,
    evidenceSpan: input.span,
    confidence: "HIGH",
    quantity: input.quantity,
    canonicalConcept: canonicalizeConcept(input.quantity, input.state.chunk),
    value: input.value,
    unit: input.unit,
    qualifier: input.qualifier,
  };
}

function splitSentences(content: string): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  const pattern = /[^.!?]+[.!?]?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    const raw = match[0];
    const leadingWhitespace = raw.match(/^\s*/)?.[0].length ?? 0;
    const text = raw.trim();
    if (!text) continue;
    const startOffset = match.index + leadingWhitespace;
    spans.push({
      text: text.replace(/[.!?]+$/g, "").trim(),
      startOffset,
      endOffset: startOffset + text.length,
    });
  }
  return spans;
}

function sliceSentenceSpan(sentence: SentenceSpan, relativeStart: number, length: number): EvidenceSpan {
  const text = sentence.text.slice(relativeStart, relativeStart + length).trim();
  const trimmedLeading = sentence.text
    .slice(relativeStart, relativeStart + length)
    .match(/^\s*/)?.[0].length ?? 0;
  const startOffset = sentence.startOffset + relativeStart + trimmedLeading;
  return {
    text,
    startOffset,
    endOffset: startOffset + text.length,
  };
}

function canonicalizeFormulaConcept(
  output: string,
  state: CapabilityState
): CanonicalConcept | undefined {
  if (normalizeSymbol(output)) return undefined;
  return canonicalizeConcept(output, state.chunk);
}

function inferFormulaConcept(
  sentenceText: string,
  formulaStart: number,
  left: string,
  state: CapabilityState
): CanonicalConcept | undefined {
  const prefix = sentenceText.slice(0, formulaStart).replace(/[:;,]\s*$/g, "").trim();
  const normalizedPrefix = normalizeConceptText(prefix);

  const ohmsLaw =
    prefix.toLowerCase().match(/\bohm'?s law\b/) ??
    normalizedPrefix.match(/\bohm'?s law\b/);
  if (ohmsLaw) return canonicalizeConcept(ohmsLaw[0], state.chunk);

  const scopedResistance = normalizedPrefix.match(/\bresistors?\s+in\s+(series|parallel)\b/);
  if (scopedResistance) {
    return canonicalizeConcept(`${scopedResistance[1]} resistance rule`, state.chunk);
  }

  if (normalizeSymbol(left)) return undefined;
  return undefined;
}

function extractFormulaSymbols(expression: string): SymbolReference[] {
  const symbols = new Map<string, SymbolReference>();
  for (const match of expression.matchAll(/\b[A-Za-z]\d*\b|[λρθαβγπδ]/g)) {
    const raw = match[0];
    if (raw.toLowerCase() === "x" && isMultiplicationToken(expression, match.index ?? 0)) {
      continue;
    }
    const symbol = normalizeSymbol(raw);
    if (symbol) symbols.set(symbol.normalized, symbol);
  }
  return [...symbols.values()];
}

function isMultiplicationToken(expression: string, index: number): boolean {
  const before = expression.slice(0, index).trimEnd().slice(-1);
  const after = expression.slice(index + 1).trimStart().charAt(0);
  return Boolean(before && after && /[A-Za-z0-9)]/.test(before) && /[A-Za-z0-9(]/.test(after));
}

function normalizeFormulaExpression(expression: string): string {
  return expression
    .toLowerCase()
    .replace(/[×x*]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/\s+/g, "")
    .replace(/per/g, "/")
    .replace(/−/g, "-");
}

function normalizeFormulaSide(side: string): string {
  return side
    .replace(/\b(?:formula|is|equals?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFormulaLeft(side: string): string {
  const cleaned = normalizeFormulaSide(side);
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const lastToken = tokens[tokens.length - 1];
  if (tokens.length > 1 && lastToken && normalizeSymbol(lastToken)) {
    return lastToken;
  }
  return cleaned;
}

function normalizeFormulaOutput(output: string): string | undefined {
  const symbol = normalizeSymbol(output);
  if (symbol) return symbol.normalized;
  const cleaned = cleanConcept(output);
  return cleaned || undefined;
}

function isFormulaRightSide(value: string): boolean {
  return /[+\-*/÷×x()=]|\b(?:over|per)\b/i.test(value) || /\b[A-Za-z]\b.*\b[A-Za-z]\b/.test(value);
}

function isFormulaLike(value: string): boolean {
  return /\w\s*=\s*\w/.test(value);
}

function isSymbolDefinitionSentence(value: string): boolean {
  return /^(?:where\s+)?(?:[A-Za-z]|lambda|rho|theta|alpha|beta|gamma|pi|delta|[λρθαβγπδ])\s+(?:means|represents|denotes|stands for|is)\b/i.test(
    value
  );
}

function isUnsafeOnlySentence(text: string): boolean {
  return UNSAFE_PATTERNS.some((item) => item.pattern.test(text)) &&
    !/\b(?:is|are|means|formula|=|occurs|uses|separates|increases|decreases|reduces)\b/i.test(
      text.replace(/\bignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?\b/gi, "")
    );
}

function isDefinitionVerbContext(text: string): boolean {
  return /\b(?:is|are|means|refers to)\b.+\b(?:a|an|the)\b/i.test(text) &&
    !/\d/.test(text);
}

function normalizeRelation(relation: string): string {
  return relation.toLowerCase().trim().replace(/\s+/g, " ");
}

function cleanConcept(value: string): string {
  return normalizeConceptText(value)
    .replace(/^(?:a|an|the)\s+/, "")
    .replace(/[,:;]+$/g, "")
    .trim();
}

function cleanMeaning(value: string): string {
  return value
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeConceptText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\bthe\b/g, " ")
    .replace(/^(?:term|concept|rule for|rules for)\s+/, "")
    .replace(/\bfrom\s+(?:the\s+)?cards?\b/g, " ")
    .replace(/\brules?\b/g, " rule ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedMeaning(value: string): string {
  return cleanMeaning(value)
    .toLowerCase()
    .replace(/[×x*]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function compactStrings(values: Array<string | undefined>): string[] {
  return values.map((value) => value ?? "").filter(Boolean);
}

function singularizeConcept(value: string): string {
  return value
    .split(" ")
    .map((token) => {
      if (token.includes("'")) return token;
      if (/^(?:series|physics|mathematics|osmosis)$/.test(token)) return token;
      if (token.length > 3 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
      if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
      return token;
    })
    .join(" ");
}

function isCalculationLikeSentence(text: string): boolean {
  return /\b(percent|percentage|discount|increase|decrease|sale price|new value|calculate|find|subtract|add)\b/i.test(
    text
  );
}

function normalizeUnit(unit: string | undefined): string | undefined {
  if (!unit) return undefined;
  if (/^(?:is|are|give|gives|so|then|from|with|using)$/i.test(unit)) return undefined;
  if (unit === "%") return "percent";
  return unit.toLowerCase();
}

function inferNumericQuantity(sentenceText: string, index: number, unit?: string): string {
  const before = sentenceText.slice(0, index).toLowerCase();
  const after = sentenceText.slice(index).toLowerCase();
  if (unit === "percent") return "percentage rate";
  if (/\bsale price\s+is\s*$/i.test(before)) return "sale price";
  if (/\bnew value\s+is\s*$/i.test(before)) return "new value";
  if (/\bon\s*$/i.test(before)) return "base amount";
  if (/\bis\s*$/i.test(before)) return "calculated result";
  if (/\bdiscount\b/.test(before + after)) return "discount calculation input";
  if (/\bincrease\b/.test(before + after)) return "percentage increase input";
  if (/\bpercent(?:age)?\s+of\b/.test(before + after)) return "percentage of input";
  return "calculation value";
}
