import type {
  CapabilityFact,
  ComparisonSideCapability,
  ConsequenceCapability,
  EvidenceCapability,
  EvidenceSpan,
  EventCapability,
  ExplicitFactCapability,
  FormulaCapability,
  MethodCapability,
  NumericCapability,
  PassageInterpretationCapability,
  ProcessCapability,
  RelationCapability,
  SymbolCapability,
} from "../capabilities/types";

export type AllowedEvidenceUse =
  | "DEFINE"
  | "FORMULA"
  | "SYMBOL"
  | "CALCULATE"
  | "COMPARE"
  | "PROCESS"
  | "RELATION"
  | "CONSEQUENCE";

export type ValidatedEvidenceUnit = {
  id: string;
  sourceLabel: string;
  resourceChunkId: string;
  capabilityIds: string[];
  supportsRequirementIds: string[];
  quotedEvidence: string;
  evidenceSpans: EvidenceSpan[];
  allowedUses: AllowedEvidenceUse[];
};

export type CapabilitySupportRef = {
  requirementId: string;
  capabilityId: string;
  allowedUses: AllowedEvidenceUse[];
};

export type BuildValidatedEvidenceUnitsInput = {
  evidenceCapabilities: EvidenceCapability[];
  supportRefs: CapabilitySupportRef[];
};

type EducationalCapability =
  | CapabilityFact
  | FormulaCapability
  | SymbolCapability
  | NumericCapability
  | ExplicitFactCapability
  | MethodCapability
  | EventCapability
  | RelationCapability
  | ComparisonSideCapability
  | ProcessCapability
  | ConsequenceCapability
  | PassageInterpretationCapability;

export function buildValidatedEvidenceUnits(
  input: BuildValidatedEvidenceUnitsInput
): ValidatedEvidenceUnit[] {
  const capabilityIndex = indexEducationalCapabilities(input.evidenceCapabilities);
  const grouped = new Map<
    string,
    {
      requirementIds: string[];
      allowedUses: AllowedEvidenceUse[];
    }
  >();

  for (const ref of input.supportRefs) {
    const capability = capabilityIndex.get(ref.capabilityId);
    if (!capability) continue;
    const existing = grouped.get(capability.id);
    grouped.set(capability.id, {
      requirementIds: uniqueStrings([
        ...(existing?.requirementIds ?? []),
        ref.requirementId,
      ]),
      allowedUses: uniqueUses([...(existing?.allowedUses ?? []), ...ref.allowedUses]),
    });
  }

  const units: ValidatedEvidenceUnit[] = [];
  for (const [capabilityId, group] of grouped) {
    const capability = capabilityIndex.get(capabilityId);
    if (!capability) continue;
    units.push({
      id: `unit-${units.length + 1}`,
      sourceLabel: capability.sourceLabel,
      resourceChunkId: capability.resourceChunkId,
      capabilityIds: [capability.id],
      supportsRequirementIds: group.requirementIds,
      quotedEvidence: capability.evidenceSpan.text,
      evidenceSpans: [capability.evidenceSpan],
      allowedUses: group.allowedUses,
    });
  }

  return units;
}

export function indexEducationalCapabilities(
  evidenceCapabilities: EvidenceCapability[]
): Map<string, EducationalCapability> {
  const index = new Map<string, EducationalCapability>();
  for (const capability of evidenceCapabilities) {
    for (const item of [
      ...capability.conceptDefinitions,
      ...capability.formulas,
      ...capability.symbolDefinitions,
      ...capability.numericValues,
      ...capability.explicitFacts,
      ...capability.methods,
      ...capability.eventFacts,
      ...capability.relations,
      ...capability.comparisonSides,
      ...capability.processFacts,
      ...capability.consequences,
      ...capability.passageInterpretations,
    ]) {
      index.set(item.id, item);
    }
  }
  return index;
}

function uniqueUses(uses: AllowedEvidenceUse[]): AllowedEvidenceUse[] {
  return [...new Set(uses)];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
