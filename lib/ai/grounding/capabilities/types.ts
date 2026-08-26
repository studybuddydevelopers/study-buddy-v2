import type {
  CanonicalConcept,
  SemanticComponent,
  SemanticConcept,
} from "../semantic-concepts";

export type { CanonicalConcept, SemanticComponent, SemanticConcept };

export type CapabilityConfidence = "HIGH" | "MEDIUM" | "LOW";

export type CapabilityPolarity = "POSITIVE" | "NEGATED" | "ABSENT";

export type EvidenceSpan = {
  text: string;
  startOffset: number;
  endOffset: number;
};

export type AuthorizedEvidenceChunk = {
  resourceChunkId: string;
  sourceLabel: string;
  subjectId: string;
  topicId?: string;
  title?: string;
  content: string;
};

export type SymbolReference = {
  display: string;
  normalized: string;
};

export type FormulaSymbolContext = {
  formulaCapabilityId: string;
  normalizedExpression: string;
  resourceChunkId: string;
  sourceLabel: string;
  symbols: string[];
};

type CapabilityBase = {
  id: string;
  resourceChunkId: string;
  sourceLabel: string;
  evidenceSpan: EvidenceSpan;
  confidence: CapabilityConfidence;
  semanticComponents?: SemanticComponent[];
};

export type CapabilityFact = CapabilityBase & {
  canonicalConcept: CanonicalConcept;
  definitionText: string;
  polarity: CapabilityPolarity;
};

export type FormulaCapability = CapabilityBase & {
  canonicalConcept?: CanonicalConcept;
  expression: string;
  normalizedExpression: string;
  outputQuantity?: string;
  symbols: SymbolReference[];
  symbolDefinitions: SymbolCapability[];
  requiredInputs: string[];
};

export type SymbolCapability = CapabilityBase & {
  symbol: SymbolReference;
  meaning?: string;
  canonicalConcept?: CanonicalConcept;
  polarity: CapabilityPolarity;
  formulaContext?: FormulaSymbolContext;
};

export type NumericCapability = CapabilityBase & {
  quantity: string;
  canonicalConcept?: CanonicalConcept;
  value: number;
  unit?: string;
  qualifier?: string;
  role?: "PRICE" | "QUANTITY" | "VALUE";
};

export type ExplicitFactCapability = CapabilityBase & {
  factKey: string;
  factText: string;
  canonicalConcept?: CanonicalConcept;
  polarity: CapabilityPolarity;
};

export type MethodCapability = CapabilityBase & {
  method: string;
  stepsText: string;
  canonicalConcept?: CanonicalConcept;
};

export type EventCapability = CapabilityBase & {
  event: string;
  outcomeText: string;
  canonicalConcept?: CanonicalConcept;
  numericValues: string[];
  polarity: CapabilityPolarity;
};

export type RelationCapability = CapabilityBase & {
  subject: string;
  relation: string;
  object: string;
  polarity: CapabilityPolarity;
};

export type ComparisonSideCapability = CapabilityBase & {
  side: string;
  fact: string;
  polarity: CapabilityPolarity;
};

export type ProcessCapability = CapabilityBase & {
  process: string;
  fact: string;
};

export type ConsequenceCapability = CapabilityBase & {
  cause: string;
  effect: string;
  polarity: CapabilityPolarity;
};

export type PassageInterpretationCapability = CapabilityBase & {
  interpretationType: "MAIN_IDEA" | "EXPLICIT_DETAIL" | "SUMMARY";
  targetText?: string;
  interpretationText: string;
};

export type UnsafeContentType =
  | "PROMPT_INJECTION"
  | "SOURCE_MANIPULATION"
  | "SECRET_REQUEST"
  | "BYPASS_REQUEST";

export type UnsafeContentCapability = CapabilityBase & {
  unsafeType: UnsafeContentType;
  matchedText: string;
};

export type ConflictType =
  | "DEFINITION_CONFLICT"
  | "FORMULA_CONFLICT"
  | "NUMERIC_VALUE_CONFLICT"
  | "RELATION_CONFLICT"
  | "EXPLICIT_FACT_CONFLICT";

export type ConflictCapability = {
  id: string;
  scopeKey: string;
  conflictType: ConflictType;
  conflictingCapabilityIds: string[];
  resourceChunkIds: string[];
  sourceLabels: string[];
  evidenceSpans: EvidenceSpan[];
};

export type EvidenceCapability = {
  resourceChunkId: string;
  sourceLabel: string;
  subjectId: string;
  topicId?: string;
  sourceContent?: string;
  conceptDefinitions: CapabilityFact[];
  formulas: FormulaCapability[];
  symbolDefinitions: SymbolCapability[];
  numericValues: NumericCapability[];
  explicitFacts: ExplicitFactCapability[];
  methods: MethodCapability[];
  eventFacts: EventCapability[];
  relations: RelationCapability[];
  comparisonSides: ComparisonSideCapability[];
  processFacts: ProcessCapability[];
  consequences: ConsequenceCapability[];
  passageInterpretations: PassageInterpretationCapability[];
  semanticComponents: SemanticComponent[];
  conflicts: ConflictCapability[];
  unsafeContent?: UnsafeContentCapability[];
};

export type ExtractEvidenceCapabilitiesInput = {
  chunks: AuthorizedEvidenceChunk[];
};
