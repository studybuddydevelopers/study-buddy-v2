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
  | "CONTEXTUAL_FOLLOW_UP";

export type RequirementRole =
  | "USER"
  | "ASSISTANT"
  | "SYSTEM";

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
  requiredSymbols?: string[];
  requiredInputs?: string[];
  comparisonSides?: string[];
  requestedRelation?: string;
  requestedProcess?: string;
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
