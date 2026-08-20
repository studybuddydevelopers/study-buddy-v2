import type {
  SemanticComponent,
  SemanticConcept,
  SemanticFacet,
} from "../semantic-concepts";

export type RequirementKind =
  | "CONCEPT_DEFINITION"
  | "FORMULA"
  | "FORMULA_WITH_SYMBOLS"
  | "SYMBOL_DEFINITION"
  | "CALCULATION"
  | "COMPARISON"
  | "MULTI_PART"
  | "MULTI_OPTION_COMPARISON"
  | "RELATION_MECHANISM_CONSEQUENCE"
  | "PROCESS_EXPLANATION"
  | "CONTEXTUAL_FOLLOW_UP"
  | "FACT_LOOKUP"
  | "PROCEDURE_METHOD"
  | "PASSAGE_INTERPRETATION";

export type RequirementRole =
  | "USER"
  | "ASSISTANT"
  | "SYSTEM";

export type PresentationStyle =
  | "SIMPLE"
  | "STEP_BY_STEP"
  | "CONCISE";

export type RequestContextMessage = {
  role: RequirementRole;
  content: string;
};

export type RequestRequirement = {
  id: string;
  kind: RequirementKind;
  subjectId: string;
  topicId?: string;
  targetConcepts: string[];
  baseConcept?: SemanticConcept;
  requestedAction?: string;
  presentationStyle?: PresentationStyle;
  requestedFacet?: SemanticFacet;
  constraints?: string[];
  ignoredDirectiveText?: string[];
  requiredSemanticComponents?: SemanticComponent[];
  requiredSymbols?: string[];
  requiredInputs?: string[];
  requiredInputConcepts?: string[];
  comparisonSides?: string[];
  requestedRelation?: string;
  requestedProcess?: string;
  requestedFact?: string;
  requestedEvent?: string;
  requestedMethod?: string;
  passageTask?: "MAIN_IDEA" | "EXPLICIT_DETAIL" | "SUMMARY";
  dependsOnPreviousTurn?: boolean;
  childRequirements?: RequestRequirement[];
};

export type RequestSafetyIntent = {
  asksForCurrentExternalInfo: boolean;
  containsHostileQuotedText: boolean;
  asksToIgnoreSources: boolean;
};

export type RequestRequirements = {
  requestId: string;
  normalizedQuestion: string;
  subjectId: string;
  topicId?: string;
  requirements: RequestRequirement[];
  safetyIntent: RequestSafetyIntent;
};

export type ExtractRequestRequirementsInput = {
  requestId?: string;
  question: string;
  subjectId: string;
  topicId?: string;
  recentMessages?: RequestContextMessage[];
  maxContextMessages?: number;
};
