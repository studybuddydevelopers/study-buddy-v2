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
  EventCapability,
  ExtractEvidenceCapabilitiesInput,
  ExplicitFactCapability,
  FormulaCapability,
  MethodCapability,
  NumericCapability,
  PassageInterpretationCapability,
  ProcessCapability,
  RelationCapability,
  SymbolCapability,
  SymbolReference,
  UnsafeContentCapability,
  UnsafeContentType,
} from "./types";
import {
  canonicalizeConcept as sharedCanonicalizeConcept,
  canonicalizeSemanticConcept,
  findMentionedCanonicalConcepts,
  makeSemanticComponent,
  normalizeSemanticBaseConcept,
  type SemanticComponent,
  type SemanticFacet,
} from "../semantic-concepts";

type SentenceSpan = EvidenceSpan;

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
    sourceContent: chunk.content,
    conceptDefinitions: [],
    formulas: [],
    symbolDefinitions: [],
    numericValues: [],
    explicitFacts: [],
    methods: [],
    eventFacts: [],
    relations: [],
    comparisonSides: [],
    processFacts: [],
    consequences: [],
    passageInterpretations: [],
    semanticComponents: [],
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

    const symbolDefinitions = extractSymbolDefinitions(sentence, state);
    const formulas = extractFormulas(sentence, state, symbolDefinitions);
    capability.formulas.push(...formulas);
    capability.symbolDefinitions.push(...symbolDefinitions);

    const definitions = extractConceptDefinitions(sentence, state);
    const numerics = extractNumericValues(sentence, state);
    const facts = extractExplicitFacts(sentence, state);
    const methods = extractMethods(sentence, state);
    const events = extractEventFacts(sentence, state);
    const relations = extractRelations(sentence, state);
    const comparisonSides = extractComparisonSides(sentence, state);
    const processes = extractProcessFacts(sentence, state);
    const consequences = extractConsequences(sentence, state);
    const passageInterpretations = extractPassageInterpretations(sentence, state);

    capability.conceptDefinitions.push(...definitions);
    capability.numericValues.push(...numerics);
    capability.explicitFacts.push(...facts);
    capability.methods.push(...methods);
    capability.eventFacts.push(...events);
    capability.relations.push(...relations);
    capability.comparisonSides.push(...comparisonSides);
    capability.processFacts.push(...processes);
    capability.consequences.push(...consequences);
    capability.passageInterpretations.push(...passageInterpretations);

    updateLastSemanticTarget(state, [
      ...definitions,
      ...formulas,
      ...facts,
      ...methods,
      ...relations,
      ...processes,
      ...consequences,
    ]);
  }

  attachSemanticComponents(capability);

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
    ...detectExplicitFactConflicts(capabilities),
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
  return sharedCanonicalizeConcept(rawConcept, scope);
}

export function normalizeSymbol(rawSymbol: string): SymbolReference | undefined {
  const display = rawSymbol.trim().replace(/[.,;:!?]+$/g, "");
  if (!display) return undefined;
  const lowered = display.toLowerCase();
  const greek = GREEK_SYMBOLS.get(lowered) ?? GREEK_SYMBOLS.get(display);
  if (greek) return { display, normalized: greek };
  if (
    /^[A-Za-z]$/.test(display) ||
    /^[A-Za-z]\d+$/.test(display) ||
    /^[A-Za-z][_-][A-Za-z0-9]+$/.test(display) ||
    /^[A-Za-z][¹²³]$/.test(display)
  ) {
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

  const formulaBackedDefinition = text.match(
    /^(?:(?:an|a|the)\s+)?(.+?)\s+(?:is|are|means|refers to)\s+([^:=]+?)\s*:\s*.+?=.+$/i
  );
  if (formulaBackedDefinition) {
    const concept = cleanConcept(formulaBackedDefinition[1] ?? "");
    const definitionText = formulaBackedDefinition[2] ?? "";
    if (concept && !/\bformula\b/i.test(concept) && definitionText) {
      return [
        createConceptDefinition({
          state,
          span: sliceSentenceSpan(sentence, 0, text.indexOf(":") > 0 ? text.indexOf(":") : text.length),
          concept,
          definitionText,
          polarity: "POSITIVE",
          confidence: "HIGH",
        }),
      ];
    }
  }

  const saysDefinition = text.match(
    /^(?:(?:an|a|the)\s+)?(.+?)\s+(says?|states?)\s+(.+)$/i
  );
  if (saysDefinition && !isFormulaLike(text)) {
    const concept = cleanConcept(saysDefinition[1] ?? "");
    const definitionText = `${saysDefinition[2] ?? ""} ${saysDefinition[3] ?? ""}`.trim();
    if (concept && definitionText && !/\bnot\b/i.test(definitionText)) {
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
  }

  const definitionMatch =
    text.match(/^(?:(?:an|a|the)\s+)?(.+?)\s+(?:is|are|means|refers to)\s+(.+)$/i) ??
    text.match(/^(?:(?:an|a|the)\s+)?(.+?)\s+(shows?)\s+how\s+(.+)$/i) ??
    text.match(/^(?:(?:an|a|the)\s+)?(.+?)\s+(shows?|compares|describes|explains?|proves?|gives?)\s+(.+)$/i);
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
  const formulas: FormulaCapability[] = [
    ...extractWorkedRatioFormulas(sentence, state),
    ...extractColonFormulas(sentence, state, localSymbolDefinitions),
  ];
  const formulaPattern =
    /\b([A-Za-z][A-Za-z ]{1,40}?|[A-Za-z\u0370-\u03ff][A-Za-z0-9_\u0370-\u03ff]*)\s*=\s*([^.;]+?)(?=,?\s+where\b|[.;]|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = formulaPattern.exec(sentence.text)) !== null) {
    const rawLeft = match[1] ?? "";
    const rawLeftStart = match.index + match[0].indexOf(rawLeft);
    if (isInsideRatioLabel(sentence.text, rawLeftStart)) continue;
    if (/[:=]/.test(match[2] ?? "")) continue;
    const left = normalizeFormulaLeft(rawLeft);
    const right = normalizeFormulaSide(match[2] ?? "");
    if (!left || !right || !isFormulaRightSide(right)) continue;

    const expression = `${left} = ${right}`;
    const symbols = extractFormulaSymbols(expression);
    const inferredConcept = inferFormulaConcept(
      sentence.text,
      match.index,
      rawLeft,
      left,
      state
    );
    formulas.push({
      id: nextCapabilityId(state, "formula"),
      resourceChunkId: state.chunk.resourceChunkId,
      sourceLabel: state.chunk.sourceLabel,
      evidenceSpan: sliceSentenceSpan(sentence, match.index, match[0].length),
      confidence: "HIGH",
      canonicalConcept: inferredConcept ?? canonicalizeFormulaConcept(left, state),
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

  formulas.push(...extractNaturalLanguageFormulas(sentence, state, localSymbolDefinitions));

  return dedupeBy(formulas, (formula) =>
    `${formula.canonicalConcept?.id ?? ""}:${formula.outputQuantity ?? ""}:${formula.normalizedExpression}`
  );
}

function extractColonFormulas(
  sentence: SentenceSpan,
  state: CapabilityState,
  localSymbolDefinitions: SymbolCapability[]
): FormulaCapability[] {
  const formulas: FormulaCapability[] = [];
  const formulaPattern =
    /:\s*([A-Za-z][A-Za-z ]{0,40}?|[A-Za-z\u0370-\u03ff][A-Za-z0-9_\u0370-\u03ff]*)\s*=\s*([^.;]+?)(?=,?\s+where\b|[.;]|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = formulaPattern.exec(sentence.text)) !== null) {
    const rawLeft = match[1] ?? "";
    const left = normalizeFormulaLeft(rawLeft);
    const right = normalizeFormulaSide(match[2] ?? "");
    if (/[:=]/.test(match[2] ?? "")) continue;
    if (!left || !right || !isFormulaRightSide(right)) continue;

    const expression = `${left} = ${right}`;
    const symbols = extractFormulaSymbols(expression);
    formulas.push({
      id: nextCapabilityId(state, "formula"),
      resourceChunkId: state.chunk.resourceChunkId,
      sourceLabel: state.chunk.sourceLabel,
      evidenceSpan: sliceSentenceSpan(
        sentence,
        match.index + match[0].indexOf(rawLeft),
        `${rawLeft} = ${match[2] ?? ""}`.length
      ),
      confidence: "HIGH",
      canonicalConcept:
        inferFormulaConcept(sentence.text, match.index, rawLeft, left, state) ??
        canonicalizeFormulaConcept(left, state),
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

function extractWorkedRatioFormulas(
  sentence: SentenceSpan,
  state: CapabilityState
): FormulaCapability[] {
  const formulas: FormulaCapability[] = [];
  const ratioPattern =
    /\b(?:worked\s+ratio\s+example:\s*)?if\s+([A-Za-z][A-Za-z\s-]{0,30}?):([A-Za-z][A-Za-z\s-]{0,30}?)\s*=\s*([-+]?\d+(?:\.\d+)?)\s*:\s*([-+]?\d+(?:\.\d+)?)(?:\s+and\s+([A-Za-z][A-Za-z\s-]{0,30}?)\s*=\s*([-+]?\d+(?:\.\d+)?))?(?:,\s*)?then\s+one\s+part\s+is\s+([-+]?\d+(?:\.\d+)?),\s*so\s+([A-Za-z][A-Za-z\s-]{0,30}?)\s*=\s*([-+]?\d+(?:\.\d+)?)/i;
  const match = sentence.text.match(ratioPattern);
  if (!match || match.index === undefined) return formulas;

  const leftQuantity = cleanQuantityText(match[1] ?? "");
  const rightQuantity = cleanQuantityText(match[2] ?? "");
  const leftPart = match[3] ?? "";
  const rightPart = match[4] ?? "";
  const knownQuantity = cleanQuantityText(match[5] ?? "");
  const knownValue = match[6] ?? "";
  const onePart = match[7] ?? "";
  const targetQuantity = cleanQuantityText(match[8] ?? "");
  const targetValue = match[9] ?? "";
  const expression = [
    `${leftQuantity}:${rightQuantity} = ${leftPart}:${rightPart}`,
    knownQuantity && knownValue ? `${knownQuantity} = ${knownValue}` : null,
    `one part = ${onePart}`,
    `${targetQuantity} = ${targetValue}`,
  ]
    .filter(Boolean)
    .join("; ");
  const spanText = match[0] ?? sentence.text;

  formulas.push({
    id: nextCapabilityId(state, "formula"),
    resourceChunkId: state.chunk.resourceChunkId,
    sourceLabel: state.chunk.sourceLabel,
    evidenceSpan: sliceSentenceSpan(sentence, match.index, spanText.length),
    confidence: "HIGH",
    canonicalConcept: canonicalizeConcept(
      `worked ratio example ${leftQuantity} to ${rightQuantity}`,
      state.chunk
    ),
    expression,
    normalizedExpression: normalizeFormulaExpression(expression),
    outputQuantity: normalizeFormulaOutput(targetQuantity || rightQuantity),
    symbols: [],
    symbolDefinitions: [],
    requiredInputs: [],
  });

  return formulas;
}

function isInsideRatioLabel(text: string, index: number) {
  const previous = text.slice(0, index);
  return /[A-Za-z][A-Za-z\s-]{0,30}:\s*$/.test(previous);
}

function cleanQuantityText(value: string) {
  return value
    .replace(/\b(?:if|then|so|therefore|and|where|given|answer)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNaturalLanguageFormulas(
  sentence: SentenceSpan,
  state: CapabilityState,
  localSymbolDefinitions: SymbolCapability[]
): FormulaCapability[] {
  if (/\w\s*=\s*\w/.test(sentence.text)) return [];
  if (/\bmeasured\s+in\b/i.test(sentence.text)) return [];
  const candidates: Array<{ concept: string; right: string; raw: string; start: number }> = [];

  const formulaStatement = sentence.text.match(/\b(.+?)\s+formula\s+(?:is|equals?)\s+(.+)$/i);
  if (formulaStatement?.index !== undefined) {
    candidates.push({
      concept: cleanFormulaConceptCandidate(formulaStatement[1] ?? ""),
      right: formulaStatement[2] ?? "",
      raw: formulaStatement[0] ?? sentence.text,
      start: formulaStatement.index,
    });
  }

  const divided = sentence.text.match(/\b(.+?)\s+(?:is|are)\s+(.+?\b(?:divided by|multiplied by|times|plus|minus|over|per|added to|subtracted from)\b.+)$/i);
  if (divided?.index !== undefined) {
    candidates.push({
      concept: cleanFormulaConceptCandidate(divided[1] ?? ""),
      right: divided[2] ?? "",
      raw: divided[0] ?? sentence.text,
      start: divided.index,
    });
  }

  const foundBy = sentence.text.match(/\b(.+?)\s+(?:is|are)\s+found\s+by\s+(.+)$/i);
  if (foundBy?.index !== undefined) {
    candidates.push({
      concept: cleanFormulaConceptCandidate(foundBy[1] ?? ""),
      right: foundBy[2] ?? "",
      raw: foundBy[0] ?? sentence.text,
      start: foundBy.index,
    });
  }

  return candidates.flatMap((candidate) => {
    const concept = candidate.concept;
    const right = normalizeNaturalFormulaRight(candidate.right);
    if (!concept || !right || !isFormulaRightSide(right)) return [];
    const expression = `${concept} = ${right}`;
    const symbols = extractFormulaSymbols(expression);
    return [
      {
        id: nextCapabilityId(state, "formula"),
        resourceChunkId: state.chunk.resourceChunkId,
        sourceLabel: state.chunk.sourceLabel,
        evidenceSpan: sliceSentenceSpan(sentence, candidate.start, candidate.raw.length),
        confidence: "HIGH" as const,
        canonicalConcept: canonicalizeConcept(concept, state.chunk),
        expression,
        normalizedExpression: normalizeFormulaExpression(expression),
        outputQuantity: normalizeFormulaOutput(concept),
        symbols,
        symbolDefinitions: localSymbolDefinitions.filter((definition) =>
          symbols.some((symbol) => symbol.normalized === definition.symbol.normalized)
        ),
        requiredInputs: inferNaturalFormulaInputs(right),
      },
    ];
  });
}

function extractSymbolDefinitions(
  sentence: SentenceSpan,
  state: CapabilityState
): SymbolCapability[] {
  const definitions: SymbolCapability[] = [];
  const seen = new Set<string>();
  const symbolToken = String.raw`([A-Za-z\u0370-\u03ff][A-Za-z0-9_\u0370-\u03ff]*|lambda|rho|theta|alpha|beta|gamma|pi|delta|[λρθαβγπδ])`;
  const symbolStart = String.raw`(?:\b|(?=[λρθαβγπδ]))`;
  const definitionVerb = String.raw`(?:means|represents|denotes|stands for|is)`;
  const nextDefinition = String.raw`(?:,?\s+and\s+|,\s*)${symbolToken}\s+${definitionVerb}\b`;
  const definitionEnd = String.raw`(?=${nextDefinition}|,?\s+but\b|[.;]|$)`;
  const patterns: Array<{ pattern: RegExp; meaningIndex: number }> = [
    {
      pattern: new RegExp(
        String.raw`${symbolStart}${symbolToken}\s+${definitionVerb}\s+(.+?)${definitionEnd}`,
        "gi"
      ),
      meaningIndex: 2,
    },
    {
      pattern: new RegExp(
        String.raw`\bwhere\s+${symbolStart}${symbolToken}\s+${definitionVerb}\s+(.+?)${definitionEnd}`,
        "gi"
      ),
      meaningIndex: 2,
    },
    {
      pattern: new RegExp(
        String.raw`\bdefines?\s+${symbolStart}${symbolToken}\s+as\s+(.+?)${definitionEnd}`,
        "gi"
      ),
      meaningIndex: 2,
    },
    {
      pattern: new RegExp(
        String.raw`${symbolStart}${symbolToken}\s*=\s*([A-Za-z][A-Za-z ]{2,40})(?=[,.;]|$)`,
        "gi"
      ),
      meaningIndex: 2,
    },
  ];

  for (const { pattern, meaningIndex } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(sentence.text)) !== null) {
      const rawSymbol = match[1] ?? "";
      const symbol = normalizeSymbol(rawSymbol);
      if (!symbol) continue;

      const meaning = match[meaningIndex] ?? "";
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

  const negatedPatterns = [
    new RegExp(String.raw`${symbolStart}${symbolToken}\s+is\s+not\s+defined\b`, "i"),
    new RegExp(String.raw`\bdoes\s+not\s+define\s+${symbolStart}${symbolToken}\b`, "i"),
    new RegExp(String.raw`\bgives?\s+no\s+meaning\s+for\s+${symbolStart}${symbolToken}\b`, "i"),
  ];
  for (const pattern of negatedPatterns) {
    const negated = sentence.text.match(pattern);
    if (!negated) continue;
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
  for (const match of sentence.text.matchAll(
    /\b([A-Za-z][A-Za-z0-9 ]{0,40}?)\s+(?:costs?|charges?)\s+([-+]?\d+(?:\.\d+)?)\s*(naira|ngn|₦|£|\$|dollars?|pounds?)\s+for\s+([-+]?\d+(?:\.\d+)?)\s*([A-Za-z][A-Za-z0-9/ ]{0,24})\b/gi
  )) {
    const qualifier = cleanConcept(match[1] ?? "");
    const price = Number(match[2]);
    const priceUnit = normalizeUnit(match[3]);
    const quantity = Number(match[4]);
    const quantityUnit = normalizeUnit(match[5]);
    if (!qualifier || !Number.isFinite(price) || !Number.isFinite(quantity)) continue;
    values.push(
      createNumericValue({
        state,
        span: sliceSentenceSpan(sentence, match.index ?? 0, match[0].length),
        quantity: "cost",
        qualifier,
        value: price,
        unit: priceUnit,
        role: "PRICE",
      }),
      createNumericValue({
        state,
        span: sliceSentenceSpan(sentence, match.index ?? 0, match[0].length),
        quantity: "quantity",
        qualifier,
        value: quantity,
        unit: quantityUnit,
        role: "QUANTITY",
      })
    );
  }

  for (const qualified of sentence.text.matchAll(
    /\b(?:the\s+)?([A-Za-z][A-Za-z ]{1,40}?)\s+(?:across|in|of|for|through)\s+(?:the\s+)?([A-Za-z][A-Za-z ]{1,40}?)\s+is\s+([-+]?\d+(?:\.\d+)?)\s*([A-Za-z%/²³][A-Za-z0-9%/²³]*)\b/gi
  )) {
    values.push(
      createNumericValue({
        state,
        span: sliceSentenceSpan(sentence, qualified.index ?? 0, qualified[0].length),
        quantity: cleanConcept(qualified[1] ?? ""),
        qualifier: cleanConcept(qualified[2] ?? ""),
        value: Number(qualified[3]),
        unit: normalizeExtractedUnit(qualified[4]),
        role: inferNumericRole(qualified[1] ?? "", qualified[4]),
      })
    );
  }

  for (const direct of sentence.text.matchAll(
    /\b(?:the\s+)?([A-Za-z][A-Za-z ]{1,40}?)\s+is\s+([-+]?\d+(?:\.\d+)?)\s*([A-Za-z%/²³][A-Za-z0-9%/²³]*)\b/gi
  )) {
    if (isDefinitionVerbContext(sentence.text)) continue;
    values.push(
      createNumericValue({
        state,
        span: sliceSentenceSpan(sentence, direct.index ?? 0, direct[0].length),
        quantity: cleanLeadingNumericQuantity(direct[1] ?? ""),
        value: Number(direct[2]),
        unit: normalizeExtractedUnit(direct[3]),
        role: inferNumericRole(direct[1] ?? "", direct[3]),
      })
    );
  }

  for (const ofValue of sentence.text.matchAll(
    /\b(?:the\s+|an?\s+)?([A-Za-z][A-Za-z ]{1,40}?)\s+of\s+([-+]?\d+(?:\.\d+)?)\b/gi
  )) {
    values.push(
      createNumericValue({
        state,
        span: sliceSentenceSpan(sentence, ofValue.index ?? 0, ofValue[0].length),
        quantity: cleanConcept(ofValue[1] ?? ""),
        value: Number(ofValue[2]),
        role: inferNumericRole(ofValue[1] ?? "", undefined),
      })
    );
  }

  for (const noUnit of sentence.text.matchAll(
    /\b(?:the\s+)?([A-Za-z][A-Za-z ]{0,40}?)\s+is\s+([-+]?\d+(?:\.\d+)?)(?=,|;|\.|\s+and\b|\s+so\b|$)/gi
  )) {
    values.push(
      createNumericValue({
        state,
        span: sliceSentenceSpan(sentence, noUnit.index ?? 0, noUnit[0].length),
        quantity: cleanLeadingNumericQuantity(noUnit[1] ?? ""),
        value: Number(noUnit[2]),
        role: inferNumericRole(noUnit[1] ?? "", undefined),
      })
    );
  }

  for (const adjacent of sentence.text.matchAll(
    /\b(?:the\s+)?([A-Za-z][A-Za-z ]{1,40}?)\s+([-+]?\d+(?:\.\d+)?)\s*([A-Za-z%/²³][A-Za-z0-9%/²³]*)\b/gi
  )) {
    const quantity = cleanAdjacentNumericQuantity(adjacent[1] ?? "");
    if (!quantity || isMostlyVerbPhrase(quantity)) continue;
    values.push(
      createNumericValue({
        state,
        span: sliceSentenceSpan(sentence, adjacent.index ?? 0, adjacent[0].length),
        quantity,
        value: Number(adjacent[2]),
        unit: normalizeExtractedUnit(adjacent[3]),
        role: inferNumericRole(quantity, adjacent[3]),
      })
    );
  }

  if (isCalculationLikeSentence(sentence.text)) {
    const seen = new Set(values.map((item) => `${item.value}:${item.unit ?? ""}`));
    for (const match of sentence.text.matchAll(/\b([-+]?\d+(?:\.\d+)?)\s*(percent|%|[A-Za-z0-9/²³]+)?\b/gi)) {
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
          role: inferNumericRole(inferNumericQuantity(sentence.text, match.index ?? 0, unit), unit),
        })
      );
    }
  }

  return dedupeBy(
    values,
    (value) =>
      `${value.value}:${value.unit ?? ""}`
  );
}

function extractExplicitFacts(
  sentence: SentenceSpan,
  state: CapabilityState
): ExplicitFactCapability[] {
  const facts: ExplicitFactCapability[] = [];
  const text = sentence.text;
  const limitationMatch =
    text.match(/\b(?:its|the)\s+limitation\s+is\s+(.+)$/i) ??
    text.match(/\b(.+?)\s+(?:cannot|can not|does not|do not)\s+(.+)$/i);
  if (limitationMatch) {
    const concept = limitationMatch.length >= 3
      ? cleanConcept(limitationMatch[1] ?? "")
      : state.lastSemanticTarget ?? "limitation";
    const factText = limitationMatch.length >= 3
      ? `${limitationMatch[1] ?? ""} ${limitationMatch[2] ?? ""}`.trim()
      : text;
    facts.push(
      createExplicitFact({
        state,
        span: sentence,
        factKey: `${concept || state.lastSemanticTarget || "concept"} limitation`,
        factText,
        concept: concept || state.lastSemanticTarget,
        polarity: "POSITIVE",
      })
    );
  }

  const conditionMatch = text.match(/\b(.+?)\s+(?:must|should|needs?\s+to)\s+(.+)$/i);
  if (conditionMatch && !isFormulaLike(text)) {
    const concept = cleanConcept(conditionMatch[1] ?? "");
    const factText = text;
    if (concept && factText) {
      facts.push(
        createExplicitFact({
          state,
          span: sentence,
          factKey: `${concept} condition`,
          factText,
          concept,
          polarity: "POSITIVE",
        })
      );
    }
  }

  const patterns: Array<{ match: RegExp; key: (match: RegExpMatchArray) => string; concept?: (match: RegExpMatchArray) => string }> = [
    {
      match: /\bpractice\s+paper\s+identifier\s*:\s*(.+)$/i,
      key: () => "practice paper identifier",
      concept: () => "identifier",
    },
    {
      match: /\b(?:question|item)\s+(\d+[A-Za-z]?)\b/i,
      key: (match) => `question ${match[1] ?? ""}`.trim(),
      concept: () => "identifier",
    },
    {
      match: /\banswer\s*:\s*(.+)$/i,
      key: () => "answer",
    },
  ];

  const canBeKinds = text.match(/\b(.+?)\s+can\s+be\s+(.+)$/i);
  if (canBeKinds) {
    const concept = cleanConcept(canBeKinds[1] ?? "");
    const factText = cleanMeaning(canBeKinds[2] ?? "");
    if (concept && factText) {
      facts.push(
        createExplicitFact({
          state,
          span: sentence,
          factKey: `${concept} kinds`,
          factText,
          concept,
          polarity: "POSITIVE",
        })
      );
    }
  }

  for (const pattern of patterns) {
    const match = text.match(pattern.match);
    if (!match) continue;
    const factKey = pattern.key(match);
    if (!factKey) continue;
    facts.push(
      createExplicitFact({
        state,
        span: sentence,
        factKey,
        factText: text,
        concept: pattern.concept?.(match) ?? factKey,
        polarity: /\b(?:not|never|no)\b/i.test(text) ? "NEGATED" : "POSITIVE",
      })
    );
  }

  for (const match of text.matchAll(/\bthere\s+(?:are|is)\s+([^,.;]+?)(?=,\s*there\s+(?:are|is)\b|[.;]|$)/gi)) {
    const factKey = cleanConcept(match[1] ?? "");
    if (!factKey) continue;
    facts.push(
      createExplicitFact({
        state,
        span: sliceSentenceSpan(sentence, match.index ?? 0, match[0].length),
        factKey,
        factText: match[0] ?? text,
        concept: factKey,
        polarity: /\b(?:not|never|no)\b/i.test(match[0] ?? "") ? "NEGATED" : "POSITIVE",
      })
    );
  }

  return dedupeBy(facts, (fact) => `${fact.factKey}:${fact.factText}`);
}

function extractMethods(
  sentence: SentenceSpan,
  state: CapabilityState
): MethodCapability[] {
  const text = sentence.text;
  const matches = [
    text.match(/\b(.+?)\s+can\s+be\s+(?:solved|found|calculated|worked\s+out|balanced|separated|prepared|made|done)\s+by\s+(.+)$/i),
    text.match(/\b(.+?)\s+(?:is|are)\s+(?:found|calculated|worked\s+out)\s+by\s+(.+)$/i),
    text.match(/\b(.+?)\s+can\s+((?:recover|separate|remove|filter|extract|collect|produce|form|make)\b.+)$/i),
    text.match(/\bfor\s+(.+?),\s*(.+?\b(?:subtract|add|divide|multiply|balance|filter|heat|cool|apply|remove|separate|mix|measure|solve)\b.+)$/i),
    text.match(/\b(.+?)\s+(?:is|are)\s+made\s+by\s+(.+)$/i),
    text.match(/\b((?:find|calculate|work\s+out)\s+.+?\bfirst\b.+?\bthen\b.+)$/i)
      ? ["", state.lastSemanticTarget ?? "worked example", text] as unknown as RegExpMatchArray
      : null,
  ].filter((match): match is RegExpMatchArray => Boolean(match));

  return matches.map((match) => {
    const target = cleanConcept(match[1] ?? "");
    return {
      id: nextCapabilityId(state, "method"),
      resourceChunkId: state.chunk.resourceChunkId,
      sourceLabel: state.chunk.sourceLabel,
      evidenceSpan: sentence,
      confidence: "HIGH",
      method: target,
      stepsText: cleanMeaning(`${match[2] ?? ""}` || text),
      canonicalConcept: target ? canonicalizeConcept(target, state.chunk) : undefined,
    };
  });
}

function extractEventFacts(
  sentence: SentenceSpan,
  state: CapabilityState
): EventCapability[] {
  const text = sentence.text;
  const probabilityMatch =
    text.match(/\b(?:for\s+(.+?),\s*)?(?:the\s+)?(?:probability|chance|likelihood)\s+of\s+(.+?)\s+is\s+(.+)$/i) ??
    text.match(/\b(?:the\s+)?(?:probability|chance|likelihood)\s+for\s+(.+?)\s+is\s+(.+)$/i);
  if (!probabilityMatch) return [];

  const scopedPrefix = probabilityMatch.length >= 4 ? cleanConcept(probabilityMatch[1] ?? "") : "";
  const event = probabilityMatch.length >= 4
    ? cleanEventText(`${probabilityMatch[2] ?? ""} ${scopedPrefix}`.trim())
    : cleanEventText(probabilityMatch[1] ?? "");
  const outcome = probabilityMatch.length >= 4 ? probabilityMatch[3] ?? "" : probabilityMatch[2] ?? "";
  if (!event || !outcome) return [];

  return [
    {
      id: nextCapabilityId(state, "event"),
      resourceChunkId: state.chunk.resourceChunkId,
      sourceLabel: state.chunk.sourceLabel,
      evidenceSpan: sentence,
      confidence: "HIGH",
      event,
      outcomeText: cleanMeaning(outcome),
      canonicalConcept: canonicalizeConcept("probability", state.chunk),
      numericValues: [...text.matchAll(/\b\d+\s+out\s+of\s+\d+\b|\b\d+\/\d+\b/g)].map(
        (match) => match[0]
      ),
      polarity: /\b(?:not|never|no)\b/i.test(text) ? "NEGATED" : "POSITIVE",
    },
  ];
}

function extractRelations(
  sentence: SentenceSpan,
  state: CapabilityState
): RelationCapability[] {
  const relations: RelationCapability[] = [];
  for (const clause of splitRelationClauses(sentence)) {
    const relationMatch =
      clause.text.match(/\b(.+?)\s+(increases|decreases|reduces|affects|causes|depends on|leads to|turns?|changes?|transfers?|makes?|eats?)\s+(.+)$/i) ??
      clause.text.match(/\b(.+?)\s+(carry|carries|transport|transports)\s+(.+)$/i) ??
      clause.text.match(/\b(.+?)\s+(increases|decreases)\s+with\s+(.+)$/i);
    if (!relationMatch) continue;

    const subject = cleanConcept(relationMatch[1] ?? "");
    const relation = normalizeRelation(relationMatch[2] ?? "");
    const object = cleanConcept(relationMatch[3] ?? "");
    if (!subject || !relation || !object) continue;

    relations.push({
      id: nextCapabilityId(state, "relation"),
      resourceChunkId: state.chunk.resourceChunkId,
      sourceLabel: state.chunk.sourceLabel,
      evidenceSpan: clause,
      confidence: "HIGH",
      subject,
      relation,
      object,
      polarity: /\b(?:does not|do not|not|never)\b/i.test(clause.text)
        ? "NEGATED"
        : "POSITIVE",
    });
  }

  return relations;
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

  const says = sentence.text.match(/\b(?:an|a|the)?\s*(.+?)\s+(says?|states?)\s+(.+)$/i);
  if (says && !isFormulaLike(sentence.text)) {
    return createComparisonSide({
      state,
      sentence,
      side: cleanConcept(says[1] ?? ""),
      fact: cleanMeaning(`${says[2] ?? ""} ${says[3] ?? ""}`.trim()),
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
    sentence.text.match(/\b(.+?)\s+is\s+the\s+process\s+by\s+which\s+(.+)$/i) ??
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

function extractPassageInterpretations(
  sentence: SentenceSpan,
  state: CapabilityState
): PassageInterpretationCapability[] {
  const mainIdea =
    sentence.text.match(/\b(?:the\s+)?main\s+idea\s+(?:is|means|refers to)\s+(.+)$/i) ??
    sentence.text.match(/\b(?:the\s+)?central\s+point\s+(?:is|means|refers to)\s+(.+)$/i) ??
    sentence.text.match(/\b(?:the\s+)?passage\s+is\s+mainly\s+about\s+(.+)$/i);
  if (mainIdea) {
    return [
      {
        id: nextCapabilityId(state, "passage"),
        resourceChunkId: state.chunk.resourceChunkId,
        sourceLabel: state.chunk.sourceLabel,
        evidenceSpan: sentence,
        confidence: "HIGH",
        interpretationType: "MAIN_IDEA",
        targetText: "main idea",
        interpretationText: cleanMeaning(mainIdea[1] ?? sentence.text),
      },
    ];
  }

  const explicitDetail = sentence.text.match(
    /\b(?:supporting\s+details?|stated\s+reason|explicit\s+detail)\s+(?:is|are|explain|show|give),?\s+(.+)$/i
  );
  if (explicitDetail) {
    return [
      {
        id: nextCapabilityId(state, "passage"),
        resourceChunkId: state.chunk.resourceChunkId,
        sourceLabel: state.chunk.sourceLabel,
        evidenceSpan: sentence,
        confidence: "HIGH",
        interpretationType: "EXPLICIT_DETAIL",
        interpretationText: cleanMeaning(explicitDetail[1] ?? sentence.text),
      },
    ];
  }

  return [];
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
      if (normalizedMeaning(numeric.quantity) === "calculation value") continue;
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

function detectExplicitFactConflicts(
  capabilities: EvidenceCapability[]
): Array<Omit<ConflictCapability, "id">> {
  const grouped = new Map<string, ExplicitFactCapability[]>();
  for (const capability of capabilities) {
    for (const fact of capability.explicitFacts) {
      if (fact.polarity !== "POSITIVE") continue;
      const key = `fact:${normalizeFactScope(fact.factKey, fact.canonicalConcept?.id)}`;
      grouped.set(key, [...(grouped.get(key) ?? []), fact]);
    }
  }

  return buildPairwiseConflicts(grouped, "EXPLICIT_FACT_CONFLICT", (left, right) =>
    normalizedMeaning(left.factText) !== normalizedMeaning(right.factText)
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
  lastSemanticTarget?: string;
};

function createCapabilityState(chunk: AuthorizedEvidenceChunk): CapabilityState {
  return { chunk, sequence: 0 };
}

function updateLastSemanticTarget(
  state: CapabilityState,
  capabilities: Array<{
    canonicalConcept?: CanonicalConcept;
    process?: string;
    method?: string;
    subject?: string;
    cause?: string;
  }>
) {
  const target = capabilities
    .map((capability) =>
      capability.canonicalConcept?.aliases[0] ??
      capability.canonicalConcept?.label ??
      capability.process ??
      capability.method ??
      capability.subject ??
      capability.cause
    )
    .find(Boolean);
  if (target) state.lastSemanticTarget = target;
}

function attachSemanticComponents(capability: EvidenceCapability) {
  const allComponents: SemanticComponent[] = [];
  const component = (
    input: Omit<Parameters<typeof componentForCapability>[0], "subjectId" | "topicId">
  ) =>
    componentForCapability({
      ...input,
      subjectId: capability.subjectId,
      topicId: capability.topicId,
    });

  for (const definition of capability.conceptDefinitions) {
    if (definition.polarity !== "POSITIVE") {
      definition.semanticComponents = [];
      continue;
    }
    const facets = definitionFacets(definition.definitionText, definition.evidenceSpan.text);
    definition.semanticComponents = facets.map((facet) =>
      component({
        kind: facet,
        conceptRaw: definition.canonicalConcept.aliases[0] ?? definition.canonicalConcept.label,
        capability: definition,
        text: definition.definitionText,
      })
    );
    allComponents.push(...definition.semanticComponents);
  }

  for (const formula of capability.formulas) {
    formula.semanticComponents = [
      component({
        kind: "FORMULA",
        conceptRaw:
          formula.canonicalConcept?.aliases[0] ??
          formula.canonicalConcept?.label ??
          formula.outputQuantity ??
          formula.expression,
        capability: formula,
        text: formula.expression,
      }),
      ...(formula.outputQuantity
        ? [
            component({
              kind: "SYMBOL",
              conceptRaw: formula.outputQuantity,
              capability: formula,
              text: formula.expression,
              symbol: formula.outputQuantity,
            }),
          ]
        : []),
    ];
    allComponents.push(...formula.semanticComponents);
  }

  for (const symbol of capability.symbolDefinitions) {
    if (symbol.polarity !== "POSITIVE") {
      symbol.semanticComponents = [];
      continue;
    }
    symbol.semanticComponents = [
      component({
        kind: "SYMBOL",
        conceptRaw: symbol.meaning ?? symbol.symbol.normalized,
        capability: symbol,
        text: symbol.meaning ?? symbol.evidenceSpan.text,
        symbol: symbol.symbol.normalized,
      }),
    ];
    allComponents.push(...symbol.semanticComponents);
  }

  for (const numeric of capability.numericValues) {
    numeric.semanticComponents = [
      component({
        kind: "QUANTITY",
        conceptRaw: numeric.quantity,
        capability: numeric,
        text: numeric.evidenceSpan.text,
        value: numeric.value,
        unit: numeric.unit,
      }),
    ];
    allComponents.push(...numeric.semanticComponents);
  }

  for (const fact of capability.explicitFacts) {
    if (fact.polarity !== "POSITIVE") {
      fact.semanticComponents = [];
      continue;
    }
    fact.semanticComponents = [
      component({
        kind: "EXPLICIT_FACT",
        conceptRaw: fact.canonicalConcept?.aliases[0] ?? fact.factKey,
        capability: fact,
        text: fact.factText,
      }),
      ...definitionFacets(fact.factText, fact.evidenceSpan.text)
        .filter((facet) => facet !== "DEFINITION")
        .map((facet) =>
          component({
            kind: facet,
            conceptRaw: fact.canonicalConcept?.aliases[0] ?? fact.factKey,
            capability: fact,
            text: fact.factText,
          })
        ),
    ];
    allComponents.push(...fact.semanticComponents);
  }

  for (const method of capability.methods) {
    method.semanticComponents = [
      component({
        kind: "METHOD",
        conceptRaw: method.method,
        capability: method,
        text: method.stepsText,
      }),
    ];
    allComponents.push(...method.semanticComponents);
  }

  for (const event of capability.eventFacts) {
    if (event.polarity !== "POSITIVE") {
      event.semanticComponents = [];
      continue;
    }
    event.semanticComponents = [
      component({
        kind: "EXPLICIT_FACT",
        conceptRaw: event.event,
        capability: event,
        text: event.outcomeText,
      }),
    ];
    allComponents.push(...event.semanticComponents);
  }

  for (const relation of capability.relations) {
    if (relation.polarity !== "POSITIVE") {
      relation.semanticComponents = [];
      continue;
    }
    const relationKind = relationFacet(relation.relation, relation.evidenceSpan.text);
    relation.semanticComponents = [
      component({
        kind: relationKind,
        conceptRaw: relation.subject,
        capability: relation,
        text: relation.evidenceSpan.text,
        relation: relation.relation,
        object: relation.object,
      }),
      ...findMentionedCanonicalConcepts(
        `${relation.subject} ${relation.relation} ${relation.object}`,
        capability
      )
        .filter((concept) => concept.id !== canonicalizeConcept(relation.subject, capability).id)
        .map((concept) =>
          component({
            kind: relationKind,
            conceptRaw: concept.aliases[0] ?? concept.label,
            capability: relation,
            text: relation.evidenceSpan.text,
            relation: relation.relation,
            object: relation.object,
          })
        ),
    ];
    allComponents.push(...relation.semanticComponents);
  }

  for (const side of capability.comparisonSides) {
    if (side.polarity !== "POSITIVE") {
      side.semanticComponents = [];
      continue;
    }
    side.semanticComponents = [
      component({
        kind: "COMPARISON_SIDE",
        conceptRaw: side.side,
        capability: side,
        text: side.fact,
      }),
    ];
    allComponents.push(...side.semanticComponents);
  }

  for (const process of capability.processFacts) {
    process.semanticComponents = [
      component({
        kind: processFacet(process.fact),
        conceptRaw: process.process,
        capability: process,
        text: process.fact,
      }),
    ];
    allComponents.push(...process.semanticComponents);
  }

  for (const consequence of capability.consequences) {
    if (consequence.polarity !== "POSITIVE") {
      consequence.semanticComponents = [];
      continue;
    }
    consequence.semanticComponents = [
      component({
        kind: "CONSEQUENCE",
        conceptRaw: consequence.cause,
        capability: consequence,
        text: consequence.effect,
        relation: "cause",
        object: consequence.effect,
      }),
    ];
    allComponents.push(...consequence.semanticComponents);
  }

  for (const passage of capability.passageInterpretations) {
    passage.semanticComponents = [
      component({
        kind: "PASSAGE_INTERPRETATION",
        conceptRaw: passage.targetText ?? passage.interpretationType,
        capability: passage,
        text: passage.interpretationText,
      }),
    ];
    allComponents.push(...passage.semanticComponents);
  }

  capability.semanticComponents = allComponents;
}

function componentForCapability(input: {
  subjectId: string;
  topicId?: string;
  kind: SemanticComponent["kind"];
  conceptRaw: string;
  capability: {
    id: string;
    resourceChunkId: string;
    sourceLabel: string;
    evidenceSpan: EvidenceSpan;
  };
  text: string;
  symbol?: string;
  relation?: string;
  object?: string;
  value?: number;
  unit?: string;
}): SemanticComponent {
  const facet = isSemanticFacet(input.kind) ? input.kind : undefined;
  return makeSemanticComponent({
    kind: input.kind,
    concept: canonicalizeSemanticConcept({
      rawConcept: input.conceptRaw,
      subjectId: input.subjectId,
      topicId: input.topicId,
      facet,
    }),
    symbol: input.symbol,
    relation: input.relation,
    object: input.object,
    value: input.value,
    unit: input.unit,
    text: input.text || input.capability.evidenceSpan.text,
    sourceCapabilityId: input.capability.id,
    resourceChunkId: input.capability.resourceChunkId,
    sourceLabel: input.capability.sourceLabel,
  });
}

function definitionFacets(definitionText: string, evidenceText: string): SemanticFacet[] {
  const combined = normalizeConceptText(`${definitionText} ${evidenceText}`);
  const facets: SemanticFacet[] = ["DEFINITION"];
  if (/\b(?:formula|equals?|pi|squared|square|times|multiply|multiplied|multiplying|divide|divided|dividing|add|added|adding|subtract|subtracted|minus)\b/.test(combined)) {
    facets.push("FORMULA");
  }
  if (/\b(?:found by|calculated by|worked out by|solved by|adding|dividing|multiplying|subtracting|simplified by)\b/.test(combined)) {
    facets.push("METHOD");
  }
  if (/\b(?:measured in|unit|units|volts?|amperes?|amps?|ohms?|watts?|metres?|meters?|seconds?|grams?|kilograms?|pascals?|newtons?)\b/.test(combined)) {
    facets.push("UNIT");
  }
  if (/\b(?:purpose|used for|useful for|helps?|needed for|for growth|for repair|role is)\b/.test(combined)) {
    facets.push("PURPOSE");
  }
  if (/\b(?:function|role|transports?|carries|allows?|does not allow)\b/.test(combined)) {
    facets.push("FUNCTION");
  }
  if (/\b(?:process|by which|changes?|separates?|produces?|forms?|turns?|passes?)\b/.test(combined)) {
    facets.push("PROCESS");
  }
  if (/\b(?:limitation|cannot|can not|does not|do not|not suitable|rather than)\b/.test(combined)) {
    facets.push("LIMITATION");
  }
  if (/\b(?:causes?|leads to|results? in|effect|reduces?|increases?)\b/.test(combined)) {
    facets.push("CONSEQUENCE");
  }
  return uniqueSemanticFacets(facets);
}

function relationFacet(relation: string, evidenceText: string): SemanticComponent["kind"] {
  const combined = normalizeConceptText(`${relation} ${evidenceText}`);
  if (/\b(?:transport|carry|allow|does not allow|do not allow|make|eat|transfer)\b/.test(combined)) return "FUNCTION";
  if (/\b(?:purpose|useful|used for|needed for|helps?)\b/.test(combined)) return "PURPOSE";
  if (/\b(?:cannot|can not|does not|do not|limitation|rather than)\b/.test(combined)) return "LIMITATION";
  if (/\b(?:cause|lead to|reduce|increase|effect|result)\b/.test(combined)) return "CONSEQUENCE";
  return "RELATION";
}

function processFacet(text: string): SemanticComponent["kind"] {
  const normalized = normalizeConceptText(text);
  if (/\b(?:limitation|cannot|can not|does not|do not)\b/.test(normalized)) return "LIMITATION";
  if (/\b(?:used for|useful|purpose|needed for|helps?)\b/.test(normalized)) return "PURPOSE";
  if (/\b(?:method|steps?|found by|calculated by|separated by|using)\b/.test(normalized)) return "METHOD";
  return "PROCESS";
}

function isSemanticFacet(kind: SemanticComponent["kind"]): kind is SemanticFacet {
  return [
    "DEFINITION",
    "FORMULA",
    "UNIT",
    "PURPOSE",
    "FUNCTION",
    "PROCESS",
    "LIMITATION",
    "CONSEQUENCE",
    "METHOD",
  ].includes(kind);
}

function uniqueSemanticFacets(facets: SemanticFacet[]): SemanticFacet[] {
  return [...new Set(facets)];
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
  role?: NumericCapability["role"];
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
    role: input.role,
  };
}

function createExplicitFact(input: {
  state: CapabilityState;
  span: EvidenceSpan;
  factKey: string;
  factText: string;
  concept?: string;
  polarity: CapabilityPolarity;
}): ExplicitFactCapability {
  return {
    id: nextCapabilityId(input.state, "fact"),
    resourceChunkId: input.state.chunk.resourceChunkId,
    sourceLabel: input.state.chunk.sourceLabel,
    evidenceSpan: input.span,
    confidence: "HIGH",
    factKey: cleanMeaning(input.factKey),
    factText: cleanMeaning(input.factText),
    canonicalConcept: input.concept
      ? canonicalizeConcept(input.concept, input.state.chunk)
      : undefined,
    polarity: input.polarity,
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

function splitRelationClauses(sentence: SentenceSpan): SentenceSpan[] {
  const clauses: SentenceSpan[] = [];
  const pattern = /(?:^|(?:,\s*)?\bwhile\b\s+)([^,]+?)(?=(?:,\s*)?\bwhile\b|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sentence.text)) !== null) {
    const text = (match[1] ?? "").trim();
    if (!text) continue;
    const startInMatch = match[0].indexOf(match[1] ?? "");
    const startOffset = sentence.startOffset + match.index + Math.max(0, startInMatch);
    clauses.push({
      text,
      startOffset,
      endOffset: startOffset + text.length,
    });
  }
  return clauses.length > 0 ? clauses : [sentence];
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
  rawLeft: string,
  left: string,
  state: CapabilityState
): CanonicalConcept | undefined {
  const prefix = sentenceText.slice(0, formulaStart).replace(/[:;,]\s*$/g, "").trim();
  const leftContext = rawLeft
    .replace(new RegExp(`${escapeRegExp(left)}\\s*$`, "i"), "")
    .trim();
  const contextText = compactStrings([prefix, leftContext])
    .join(" ")
    .replace(/[:;,]\s*$/g, "")
    .trim();
  const normalizedPrefix = normalizeConceptText(contextText);

  const ohmsLaw =
    contextText.toLowerCase().match(/\bohm'?s law\b/) ??
    normalizedPrefix.match(/\bohm'?s law\b/);
  if (ohmsLaw) return canonicalizeConcept(ohmsLaw[0], state.chunk);

  const scopedResistance = normalizedPrefix.match(/\bresistors?\s+in\s+(series|parallel)\b/);
  if (scopedResistance) {
    return canonicalizeConcept(`${scopedResistance[1]} resistance rule`, state.chunk);
  }

  const areaOfShape = normalizedPrefix.match(/\barea\s+of\s+(a\s+)?(circle|triangle|rectangle|parallelogram)\b/);
  if (areaOfShape) {
    return canonicalizeConcept(`area of ${areaOfShape[2]}`, state.chunk);
  }

  const foundBy = normalizedPrefix.match(/\b(.+?)\s+can\s+be\s+found\s+by\b/);
  if (foundBy) {
    const concept = cleanFormulaConceptCandidate(foundBy[1] ?? "");
    if (concept) return canonicalizeConcept(concept, state.chunk);
  }

  if (!normalizedPrefix && normalizeSymbol(left) && state.lastSemanticTarget) {
    const semanticTarget = normalizeSemanticBaseConcept(state.lastSemanticTarget, "FORMULA");
    if (semanticTarget) return canonicalizeConcept(semanticTarget, state.chunk);
  }

  const candidates = [
    normalizedPrefix.match(/\b(.+?)\s+(?:formula|relation|equation)\s*(?:is|equals?|:)?$/i)?.[1],
    normalizedPrefix.match(/\b(.+?)\s+(?:is|are|equals?)$/i)?.[1],
    normalizedPrefix,
  ].map((candidate) => cleanFormulaConceptCandidate(candidate ?? ""));
  const candidate = candidates.find(Boolean);
  return candidate ? canonicalizeConcept(candidate, state.chunk) : undefined;
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

function normalizeNaturalFormulaRight(value: string): string {
  return cleanMeaning(value)
    .replace(/\bdivided\s+by\b/gi, " / ")
    .replace(/\bmultiplied\s+by\b/gi, " x ")
    .replace(/\bmultiplying\s+(.+?)\s+by\s+(.+)$/i, "$1 x $2")
    .replace(/\btimes\b/gi, " x ")
    .replace(/\bplus\b/gi, " + ")
    .replace(/\bminus\b/gi, " - ")
    .replace(/\bover\b/gi, " / ")
    .replace(/\bper\b/gi, " / ")
    .replace(/\badded\s+to\b/gi, " + ")
    .replace(/\bsubtracted\s+from\b/gi, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferNaturalFormulaInputs(value: string): string[] {
  const normalized = normalizeConceptText(value);
  return uniqueStrings(
    [
      ["distance", /\bdistance\b/],
      ["time", /\btime\b/],
      ["mass", /\bmass\b/],
      ["volume", /\bvolume\b/],
      ["force", /\bforce\b/],
      ["area", /\barea\b/],
      ["voltage", /\bvoltage\b/],
      ["current", /\bcurrent\b/],
      ["acceleration", /\bacceleration\b/],
      ["principal", /\bprincipal\b|\bp\b/],
      ["rate", /\brate\b|\br\b/],
      ["favourable outcomes", /\bfavou?rable\s+outcomes?\b/],
      ["total outcomes", /\btotal\b.{0,30}\boutcomes?\b|\bpossible\s+outcomes?\b/],
      ["original value", /\boriginal\s+value\b|\boriginal\b/],
      ["change", /\bchange\b/],
    ]
      .filter(([, pattern]) => (pattern as RegExp).test(normalized))
      .map(([input]) => input as string)
  );
}

function cleanFormulaConceptCandidate(value: string): string {
  let cleaned = cleanConcept(value)
    .replace(/^for\s+.+?,\s*/, "")
    .replace(/^(?:for\s+)?(?:a|an|the)\s+/, "")
    .replace(/\b(?:formula|relation|equation|equals?|is|are|states?|that|found by|can be measured with|measured with|can be found by)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const areaOf = cleaned.match(/^area\s+of\s+(.+)$/i);
  if (areaOf) {
    cleaned = `${cleanConcept(areaOf[1] ?? "")} area`.trim();
  }
  return cleaned;
}

function normalizeFormulaSide(side: string): string {
  return side
    .replace(/\b(?:formula|is|equals?)\b/gi, "")
    .replace(/\bsquared\b/gi, "^2")
    .replace(/\bcubed\b/gi, "^3")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanAdjacentNumericQuantity(value: string): string {
  const cleaned = cleanConcept(value)
    .replace(/\b(?:with|and|has|have|covers?|for|in|if|then|so)\b/g, " ")
    .replace(/\b(?:a|an|the|this|that)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = cleaned.split(" ").filter(Boolean);
  return tokens.slice(-2).join(" ");
}

function cleanLeadingNumericQuantity(value: string): string {
  return cleanConcept(value)
    .replace(/\b(?:if|then|so|and|with|for)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMostlyVerbPhrase(value: string): boolean {
  return /\b(?:covers?|gives?|has|have|with|then|so|if)\b/i.test(value);
}

function normalizeFormulaLeft(side: string): string {
  const cleaned = collapseRepeatedFormulaPhrase(normalizeFormulaSide(side));
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const lastToken = tokens[tokens.length - 1];
  if (tokens.length > 1 && lastToken && (normalizeSymbol(lastToken) || /^[A-Z]{2,5}$/.test(lastToken))) {
    return lastToken;
  }
  return cleaned;
}

function collapseRepeatedFormulaPhrase(value: string) {
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.length % 2 === 0) {
    const midpoint = tokens.length / 2;
    const left = tokens.slice(0, midpoint).join(" ").toLowerCase();
    const right = tokens.slice(midpoint).join(" ").toLowerCase();
    if (left === right) return tokens.slice(0, midpoint).join(" ");
  }
  if (tokens.length > 2 && tokens[0]?.toLowerCase() === tokens[tokens.length - 1]?.toLowerCase()) {
    return tokens.slice(1).join(" ");
  }
  return value;
}

function normalizeFormulaOutput(output: string): string | undefined {
  const symbol = normalizeSymbol(output);
  if (symbol) return symbol.normalized;
  const cleaned = cleanConcept(output);
  return cleaned || undefined;
}

function inferNumericRole(quantity: string, unit?: string): NumericCapability["role"] {
  const normalized = normalizeConceptText(`${quantity} ${unit ?? ""}`);
  if (/\b(price|cost|charge|fee|fare|naira|ngn|₦|£|\$|dollar|pound)\b/.test(normalized)) {
    return "PRICE";
  }
  if (/\b(quantity|items?|count|number|pack|pens?|bottles?|pages?|gb|gbs|kilometres?|kilometers?|miles?)\b/.test(normalized)) {
    return "QUANTITY";
  }
  return "VALUE";
}

function isFormulaRightSide(value: string): boolean {
  return /[+\-*/÷×x()=^]|\b(?:over|per|squared|cubed)\b/i.test(value) || /\b[A-Za-z]\b.*\b[A-Za-z]\b/.test(value);
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
    .replace(/^(?:and|but|then)\s+/, "")
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

function cleanEventText(value: string): string {
  return cleanConcept(value)
    .replace(/\brolling\s+rolling\b/g, "rolling")
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

function normalizeFactScope(factKey: string, conceptId?: string): string {
  const normalized = normalizeConceptText(`${factKey} ${conceptId ?? ""}`);
  if (/\banswer\b/.test(normalized)) return "answer";
  if (/\bidentifier\b|\bquestion\b/.test(normalized)) return "identifier";
  return normalized;
}

function normalizedMeaning(value: string): string {
  return cleanMeaning(value)
    .toLowerCase()
    .replace(/[×x*]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function compactStrings(values: Array<string | undefined>): string[] {
  return values.map((value) => value ?? "").filter(Boolean);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupeBy<T>(items: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isCalculationLikeSentence(text: string): boolean {
  return /[=/*÷×]/.test(text) ||
    /\b(percent|percentage|discount|increase|decrease|sale price|new value|calculate|find|found by|subtract|add|divide|divided|multiply|multiplied|times|speed|density|power|force)\b/i.test(
    text
  );
}

function normalizeUnit(unit: string | undefined): string | undefined {
  if (!unit) return undefined;
  if (/^(?:is|are|give|gives|so|then|from|with|using)$/i.test(unit)) return undefined;
  if (unit === "%") return "percent";
  return unit.toLowerCase();
}

function normalizeExtractedUnit(unit: string | undefined): string | undefined {
  if (!unit) return undefined;
  if (/^(?:and|but|is|are|give|gives|so|then|from|with|using)$/i.test(unit)) {
    return undefined;
  }
  return unit === "%" ? "percent" : unit;
}

function inferNumericQuantity(sentenceText: string, index: number, unit?: string): string {
  const before = sentenceText.slice(0, index).toLowerCase();
  const after = sentenceText.slice(index).toLowerCase();
  const normalizedUnit = normalizeConceptText(unit ?? "");
  if (unit === "percent") return "percentage rate";
  if (unitMatches(normalizedUnit, ["seconds?", "secs?", "s", "minutes?", "mins?", "hours?", "years?"])) return "time";
  if (unitMatches(normalizedUnit, ["metres?", "meters?", "m", "km", "kilometres?", "kilometers?"]) && !normalizedUnit.includes("/")) {
    return "distance";
  }
  if (unitMatches(normalizedUnit, ["kg", "kilograms?", "g", "grams?"])) return "mass";
  if (unitMatches(normalizedUnit, ["cm3", "cm³", "m3", "m³", "litres?", "liters?", "l"])) return "volume";
  if (unitMatches(normalizedUnit, ["a", "amps?", "amperes?"])) return "current";
  if (unitMatches(normalizedUnit, ["v", "volts?"])) return "voltage";
  if (unitMatches(normalizedUnit, ["n", "newtons?"])) return "force";
  if (/\bsale price\s+is\s*$/i.test(before)) return "sale price";
  if (/\bnew value\s+is\s*$/i.test(before)) return "new value";
  if (/\bon\s*$/i.test(before)) return "base amount";
  if (/\bis\s*$/i.test(before)) return "calculated result";
  if (/\bdiscount\b/.test(before + after)) return "discount calculation input";
  if (/\bincrease\b/.test(before + after)) return "percentage increase input";
  if (/\bpercent(?:age)?\s+of\b/.test(before + after)) return "percentage of input";
  return "calculation value";
}

function unitMatches(unit: string, alternatives: string[]): boolean {
  return alternatives.some((alternative) =>
    new RegExp(`^(?:${alternative})$`, "i").test(unit)
  );
}
