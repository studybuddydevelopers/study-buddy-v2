import type { ConflictCapability } from "../capabilities/types";
import type {
  CapabilitySupportRef,
  ValidatedEvidenceUnit,
} from "../evidence-units/validated-evidence-unit";

export type RequirementStatus =
  | "SUPPORTED"
  | "MISSING"
  | "CONFLICTING"
  | "UNSAFE";

export type AnswerabilityClassification =
  | "SUPPORTED"
  | "INSUFFICIENT_CONTEXT";

export type AnswerabilityRefusalReason =
  | "MISSING_REQUIRED_EVIDENCE"
  | "UNRESOLVED_CONFLICT"
  | "UNSAFE_REQUEST"
  | "CURRENT_EXTERNAL_INFO_UNSUPPORTED";

export type RequirementResult = {
  requirementId: string;
  status: RequirementStatus;
  supportingCapabilityIds: string[];
  supportingEvidenceUnitIds: string[];
  missingComponents: string[];
  conflictIds: string[];
};

export type AnswerabilityDecision = {
  classification: AnswerabilityClassification;
  requirementResults: RequirementResult[];
  validatedEvidenceUnits: ValidatedEvidenceUnit[];
  refusalReason?: AnswerabilityRefusalReason;
  conflictIds?: string[];
};

export type RequirementMatch = {
  requirementId: string;
  status: RequirementStatus;
  supportRefs: CapabilitySupportRef[];
  missingComponents: string[];
  conflictIds: string[];
};

export type ConflictSet = {
  conflicts: ConflictCapability[];
};
