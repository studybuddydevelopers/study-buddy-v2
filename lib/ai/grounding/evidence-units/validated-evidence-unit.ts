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
  SemanticComponent,
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

export type SemanticQuantityBinding = {
  quantityId: string;
  label: string;
  value?: number;
  unit?: string;
  role?: string;
  sourceCapabilityIds: string[];
};

export type ValidatedEvidenceUnit = {
  id: string;
  sourceLabel: string;
  resourceChunkId: string;
  capabilityIds: string[];
  supportsRequirementIds: string[];
  quotedEvidence: string;
  evidenceSpans: EvidenceSpan[];
  allowedUses: AllowedEvidenceUse[];
  semanticComponents?: SemanticComponent[];
  semanticQuantityBindings?: SemanticQuantityBinding[];
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
  const semanticQuantityBindingsBySource =
    buildSemanticQuantityBindingIndex(input.evidenceCapabilities);
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
      semanticComponents: capability.semanticComponents,
      semanticQuantityBindings:
        semanticQuantityBindingsBySource.get(evidenceSourceKey(capability)) ?? [],
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

function buildSemanticQuantityBindingIndex(evidenceCapabilities: EvidenceCapability[]) {
  const index = new Map<string, SemanticQuantityBinding[]>();
  for (const capability of evidenceCapabilities) {
    if (capability.sourceContent) {
      const sourceKey = `${capability.resourceChunkId}:${capability.sourceLabel}`;
      index.set(sourceKey, [
        ...(index.get(sourceKey) ?? []),
        ...extractSemanticQuantityBindingsFromText(capability.sourceContent, [
          `${capability.resourceChunkId}:source-content`,
        ]),
      ]);
    }
    for (const item of educationalCapabilities(capability)) {
      const key = evidenceSourceKey(item);
      index.set(key, [
        ...(index.get(key) ?? []),
        ...extractSemanticQuantityBindings(item),
      ]);
    }
  }
  return new Map(
    [...index.entries()].map(([key, bindings]) => [
      key,
      uniqueQuantityBindings(bindings),
    ])
  );
}

function educationalCapabilities(
  capability: EvidenceCapability
): EducationalCapability[] {
  return [
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
  ];
}

function evidenceSourceKey(capability: EducationalCapability) {
  return `${capability.resourceChunkId}:${capability.sourceLabel}`;
}

function extractSemanticQuantityBindings(
  capability: EducationalCapability
): SemanticQuantityBinding[] {
  return extractSemanticQuantityBindingsFromText(capability.evidenceSpan.text, [
    capability.id,
  ]);
}

function extractSemanticQuantityBindingsFromText(
  text: string,
  sourceCapabilityIds: string[]
) {
  return uniqueQuantityBindings([
    ...extractRatioQuantityBindings(text, sourceCapabilityIds),
    ...extractNamedQuantityBindings(text, sourceCapabilityIds),
  ]);
}

function uniqueQuantityBindings(
  bindings: SemanticQuantityBinding[]
): SemanticQuantityBinding[] {
  const unique = new Map<string, SemanticQuantityBinding>();
  for (const binding of bindings) {
    const key = [
      binding.quantityId,
      binding.role ?? "",
      binding.value ?? "",
      binding.unit ?? "",
    ].join(":");
    unique.set(key, binding);
  }
  return [...unique.values()];
}

function extractRatioQuantityBindings(
  text: string,
  sourceCapabilityIds: string[]
): SemanticQuantityBinding[] {
  const bindings: SemanticQuantityBinding[] = [];
  const addRatio = (
    left: string | undefined,
    right: string | undefined,
    leftValueText: string | undefined,
    rightValueText: string | undefined
  ) => {
    const leftLabel = cleanQuantityLabel(left ?? "");
    const rightLabel = cleanQuantityLabel(right ?? "");
    const leftValue = Number(leftValueText);
    const rightValue = Number(rightValueText);
    if (leftLabel && Number.isFinite(leftValue)) {
      bindings.push({
        quantityId: normalizeQuantityId(leftLabel),
        label: leftLabel,
        value: leftValue,
        role: "ratioPartValue",
        sourceCapabilityIds,
      });
    }
    if (rightLabel && Number.isFinite(rightValue)) {
      bindings.push({
        quantityId: normalizeQuantityId(rightLabel),
        label: rightLabel,
        value: rightValue,
        role: "ratioPartValue",
        sourceCapabilityIds,
      });
    }
  };

  for (const match of text.matchAll(
    /\b([A-Za-z][A-Za-z\s-]{0,30}?):([A-Za-z][A-Za-z\s-]{0,30}?)\s*=\s*([-+]?\d+(?:\.\d+)?)\s*:\s*([-+]?\d+(?:\.\d+)?)/gi
  )) {
    addRatio(match[1], match[2], match[3], match[4]);
  }
  for (const match of text.matchAll(
    /\bratio\s+of\s+([A-Za-z][A-Za-z\s-]{0,30}?)\s+to\s+([A-Za-z][A-Za-z\s-]{0,30}?)\s+(?:is|=)\s*([-+]?\d+(?:\.\d+)?)\s*:\s*([-+]?\d+(?:\.\d+)?)/gi
  )) {
    addRatio(match[1], match[2], match[3], match[4]);
  }
  for (const match of text.matchAll(
    /\b([A-Za-z][A-Za-z-]*)\s+and\s+([A-Za-z][A-Za-z-]*)\s+([A-Za-z][A-Za-z-]*)\s+(?:are\s+)?in\s+(?:the\s+)?ratio\s+([-+]?\d+(?:\.\d+)?)\s*:\s*([-+]?\d+(?:\.\d+)?)/gi
  )) {
    const sharedNoun = match[3] ?? "";
    addRatio(`${match[1]} ${sharedNoun}`, `${match[2]} ${sharedNoun}`, match[4], match[5]);
  }
  for (const match of text.matchAll(
    /\b([A-Za-z][A-Za-z\s-]{0,30}?)\s+and\s+([A-Za-z][A-Za-z\s-]{0,30}?)\s+(?:are\s+)?in\s+(?:the\s+)?ratio\s+([-+]?\d+(?:\.\d+)?)\s*:\s*([-+]?\d+(?:\.\d+)?)/gi
  )) {
    addRatio(match[1], match[2], match[3], match[4]);
  }
  return bindings;
}

function extractNamedQuantityBindings(
  text: string,
  sourceCapabilityIds: string[]
): SemanticQuantityBinding[] {
  const bindings: SemanticQuantityBinding[] = [];
  for (const match of text.matchAll(
    /\b(?:the\s+)?([A-Za-z][A-Za-z\s-]{1,42}?)(?:\s*(?:=|is|are|equals?))\s*(?:approximately|about|around)?\s*([-+]?\d+(?:\.\d+)?)(?:\s*([A-Za-z/%]+))?/gi
  )) {
    const fullMatch = match[0] ?? "";
    const label = cleanQuantityLabel(match[1] ?? "");
    const value = Number(match[2]);
    const unit = match[3]?.trim();
    if (!label || !Number.isFinite(value)) continue;
    if (isRatioPartFragment(text, match.index ?? 0, fullMatch)) continue;

    bindings.push({
      quantityId: normalizeQuantityId(label),
      label,
      value,
      unit: isConnectorWord(unit) ? undefined : unit,
      role: inferQuantityRole(label),
      sourceCapabilityIds,
    });
  }
  return bindings;
}

function isConnectorWord(value: string | undefined) {
  return !value || /^(?:and|then|so|therefore|if|where)$/i.test(value);
}

function isRatioPartFragment(text: string, index: number, fullMatch: string) {
  const previous = text.slice(Math.max(0, index - 3), index);
  const next = text.slice(index + fullMatch.length, index + fullMatch.length + 3);
  return /:\s*$/.test(previous) || /^\s*:/.test(next);
}

function inferQuantityRole(label: string) {
  const normalized = normalizeQuantityId(label);
  if (/\bone\s+part\b/.test(normalized)) return "derivedUnitValue";
  if (/\boriginal|old|marked\b/.test(normalized)) return "originalValue";
  if (/\bnew|sale|selling|final\b/.test(normalized)) return "newValue";
  if (/\bprincipal\b/.test(normalized)) return "principalValue";
  if (/\brate\b/.test(normalized)) return "rateValue";
  if (/\btime\b/.test(normalized)) return "timeValue";
  if (/\bdistance\b/.test(normalized)) return "distanceValue";
  if (/\bspeed|velocity\b/.test(normalized)) return "speedValue";
  if (/\binterest\b/.test(normalized)) return "interestValue";
  return "quantityValue";
}

function cleanQuantityLabel(value: string) {
  return value
    .replace(/\b(?:if|then|so|therefore|and|where|given|answer)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSemanticQuantityId(value: string) {
  return normalizeQuantityId(value);
}

function normalizeQuantityId(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9.%/]+/g, " ")
    .replace(/\b(?:the|a|an|value|number|amount|of|for|as|is|are|equals?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
