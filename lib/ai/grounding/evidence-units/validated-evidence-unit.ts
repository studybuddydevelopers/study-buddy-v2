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
  optionScope?: string;
  matchingAliases?: string[];
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
    ...extractBoundedProbabilityQuantityBindings(text, sourceCapabilityIds),
    ...extractDiscountQuantityBindings(text, sourceCapabilityIds),
    ...extractCostPerQuantityBindings(text, sourceCapabilityIds),
    ...extractNamedQuantityBindings(text, sourceCapabilityIds),
  ]);
}

function uniqueQuantityBindings(
  bindings: SemanticQuantityBinding[]
): SemanticQuantityBinding[] {
  const unique = new Map<string, SemanticQuantityBinding>();
  for (const binding of bindings) {
    const key = [
      normalizeQuantityId(binding.optionScope ?? ""),
      normalizeQuantityId(binding.quantityId),
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

function extractBoundedProbabilityQuantityBindings(
  text: string,
  sourceCapabilityIds: string[]
): SemanticQuantityBinding[] {
  const bindings: SemanticQuantityBinding[] = [];
  for (const match of text.matchAll(
    /\b(?:the\s+)?(?:probability|chance|likelihood)\s+(?:of|for)\s+(.+?)\s+(?:is|=)\s+([-+]?\d+(?:\.\d+)?)\s+out\s+of\s+([-+]?\d+(?:\.\d+)?)(?:[^.;]*?\b(?:simplif(?:ies|y|ied)|equals?|=)\s+(?:to\s+)?([-+]?\d+(?:\.\d+)?)\s*\/\s*([-+]?\d+(?:\.\d+)?))?/gi
  )) {
    const favourable = Number(match[2]);
    const total = Number(match[3]);
    if (!Number.isFinite(favourable) || !Number.isFinite(total)) continue;

    const referenceNumerator = Number(match[4]);
    const referenceDenominator = Number(match[5]);
    const hasReference =
      Number.isFinite(referenceNumerator) &&
      Number.isFinite(referenceDenominator) &&
      referenceDenominator !== 0;
    const fraction = hasReference
      ? `${numberToText(referenceNumerator)}/${numberToText(referenceDenominator)}`
      : total !== 0
        ? reduceIntegerFraction(favourable, total)
        : undefined;
    const referenceValue = hasReference
      ? referenceNumerator / referenceDenominator
      : total !== 0
        ? favourable / total
        : undefined;

    bindings.push(
      {
        quantityId: "favourable outcomes",
        label: "favourable outcomes",
        value: favourable,
        role: "favourableOutcomeCount",
        sourceCapabilityIds,
      },
      {
        quantityId: "total outcomes",
        label: "total outcomes",
        value: total,
        role: "totalOutcomeCount",
        sourceCapabilityIds,
      }
    );

    if (referenceValue !== undefined && Number.isFinite(referenceValue)) {
      bindings.push({
        quantityId: "probability",
        label: "probability",
        value: referenceValue,
        unit: fraction,
        role: "probabilityReferenceResult",
        sourceCapabilityIds,
      });
    }
  }

  const directCounts = new Map<string, SemanticQuantityBinding>();
  for (const match of text.matchAll(
    /\b(?:the\s+)?(?:number\s+of\s+)?(favou?rable\s+outcomes?|favou?rable\s+outcome\s+count|total\s+outcomes?|total\s+outcome\s+count|possible\s+outcomes?|possible\s+outcome\s+count)\s+(?:is|are|=|equals?)\s+([-+]?\d+(?:\.\d+)?)/gi
  )) {
    const rawLabel = cleanQuantityLabel(match[1] ?? "");
    const value = Number(match[2]);
    if (!rawLabel || !Number.isFinite(value)) continue;
    const role = /favou?rable/i.test(rawLabel)
      ? "favourableOutcomeCount"
      : "totalOutcomeCount";
    const label = role === "favourableOutcomeCount"
      ? "favourable outcomes"
      : "total outcomes";
    directCounts.set(role, {
      quantityId: label,
      label,
      value,
      role,
      matchingAliases: probabilityCountAliases(role),
      sourceCapabilityIds,
    });
  }

  bindings.push(...directCounts.values());
  return bindings;
}

function probabilityCountAliases(role: string): string[] {
  return role === "favourableOutcomeCount"
    ? [
        "favourable outcome",
        "favourable outcomes",
        "favorable outcome",
        "favorable outcomes",
        "favourable outcome count",
        "number of favourable outcomes",
      ]
    : [
        "total outcome",
        "total outcomes",
        "possible outcome",
        "possible outcomes",
        "total outcome count",
        "number of possible outcomes",
      ];
}

function extractNamedQuantityBindings(
  text: string,
  sourceCapabilityIds: string[]
): SemanticQuantityBinding[] {
  const bindings: SemanticQuantityBinding[] = [];
  for (const match of text.matchAll(
    /\b(?:the\s+)?([A-Za-z][A-Za-z\s-]{1,42}?)(?:\s*(?:=|is|are|equals?))\s*(?:approximately|about|around)?\s*([-+]?\d+(?:\.\d+)?)(?:\s*([A-Za-z0-9%/²³]+))?/gi
  )) {
    const fullMatch = match[0] ?? "";
    const label = cleanQuantityLabel(match[1] ?? "");
    const value = Number(match[2]);
    const unit = match[3]?.trim();
    if (!label || !Number.isFinite(value)) continue;
    if (isRatioPartFragment(text, match.index ?? 0, fullMatch)) continue;
    if (isArithmeticOperatorUnit(unit)) continue;

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

function extractDiscountQuantityBindings(
  text: string,
  sourceCapabilityIds: string[]
): SemanticQuantityBinding[] {
  const bindings: SemanticQuantityBinding[] = [];
  for (const match of text.matchAll(
    /\b([-+]?\d+(?:\.\d+)?)\s*(percent|%)\s+discount\s+on\s+([-+]?\d+(?:\.\d+)?)\s+(?:is|=|equals?)\s+([-+]?\d+(?:\.\d+)?)/gi
  )) {
    const rate = Number(match[1]);
    const original = Number(match[3]);
    const discount = Number(match[4]);
    if (![rate, original, discount].every(Number.isFinite)) continue;
    bindings.push(
      {
        quantityId: "discount-rate",
        label: "discount rate",
        value: rate,
        unit: "percent",
        role: "rateValue",
        sourceCapabilityIds,
      },
      {
        quantityId: "original-price",
        label: "original price",
        value: original,
        role: "originalValue",
        sourceCapabilityIds,
      },
      {
        quantityId: "discount",
        label: "discount",
        value: discount,
        role: "discountValue",
        sourceCapabilityIds,
      }
    );
  }

  for (const match of text.matchAll(
    /\b(?:sale|new)\s+price(?:\s+after\s+the\s+discount)?\s+(?:is|=|of)\s+([-+]?\d+(?:\.\d+)?)/gi
  )) {
    const salePrice = Number(match[1]);
    if (!Number.isFinite(salePrice)) continue;
    bindings.push({
      quantityId: "sale-price",
      label: "sale price",
      value: salePrice,
      role: "salePriceValue",
      sourceCapabilityIds,
    });
  }

  return bindings;
}

function extractCostPerQuantityBindings(
  text: string,
  sourceCapabilityIds: string[]
): SemanticQuantityBinding[] {
  const bindings: SemanticQuantityBinding[] = [];
  for (const match of text.matchAll(
    /\b([A-Za-z][A-Za-z0-9 ]{0,40}?)\s+costs?\s+([-+]?\d+(?:\.\d+)?)(?:\s*(naira|ngn|₦|£|\$|dollars?|pounds?))?\s+for\s+([-+]?\d+(?:\.\d+)?)\s*([A-Za-z][A-Za-z0-9/ ]{0,24})\b/gi
  )) {
    const option = cleanQuantityLabel(match[1] ?? "");
    const price = Number(match[2]);
    const priceUnit = match[3]?.trim();
    const count = Number(match[4]);
    const countUnit = cleanQuantityLabel(match[5] ?? "items");
    if (!option || !Number.isFinite(price) || !Number.isFinite(count) || count === 0) {
      continue;
    }
    const optionId = normalizeQuantityId(option);
    const optionScope = optionId;
    const aliases = optionAliases(option);
    bindings.push(
      {
        quantityId: `${optionId} total cost`,
        label: `${option} total cost`,
        value: price,
        unit: priceUnit,
        role: "priceValue",
        optionScope,
        matchingAliases: aliases,
        sourceCapabilityIds,
      },
      {
        quantityId: `${optionId} bottle count`,
        label: `${option} bottle count`,
        value: count,
        unit: countUnit,
        role: "quantityCount",
        optionScope,
        matchingAliases: aliases,
        sourceCapabilityIds,
      },
      {
        quantityId: `${optionId} unit rate`,
        label: `${option} unit rate`,
        value: price / count,
        unit: `${priceUnit ?? "cost"} per ${countUnit.replace(/s$/, "")}`,
        role: "unitRateValue",
        optionScope,
        matchingAliases: aliases,
        sourceCapabilityIds,
      }
    );
  }
  return bindings;
}

function isConnectorWord(value: string | undefined) {
  return !value || /^(?:and|then|so|therefore|if|where)$/i.test(value);
}

function isArithmeticOperatorUnit(value: string | undefined) {
  return /^(?:x|×|\*|\/|÷)$/i.test(value ?? "");
}

function isRatioPartFragment(text: string, index: number, fullMatch: string) {
  const previous = text.slice(Math.max(0, index - 3), index);
  const next = text.slice(index + fullMatch.length, index + fullMatch.length + 3);
  return /:\s*$/.test(previous) || /^\s*:/.test(next);
}

function inferQuantityRole(label: string) {
  const normalized = normalizeQuantityId(label);
  if (/\bfavou?rable\s+outcomes?\b/.test(normalized)) return "favourableOutcomeCount";
  if (/\b(?:total|possible)\s+outcomes?\b/.test(normalized)) return "totalOutcomeCount";
  if (/\bmass\b/.test(normalized)) return "massValue";
  if (/\bvolume\b/.test(normalized)) return "volumeValue";
  if (/\bacceleration\b/.test(normalized)) return "accelerationValue";
  if (/\bforce\b/.test(normalized)) return "forceValue";
  if (/\bcurrent\b/.test(normalized)) return "currentValue";
  if (/\bvoltage\b/.test(normalized)) return "voltageValue";
  if (/\bresistance\b/.test(normalized)) return "resistanceValue";
  if (/\bone\s+part\b/.test(normalized)) return "derivedUnitValue";
  if (normalized === "p") return "principalValue";
  if (normalized === "r") return "rateValue";
  if (normalized === "t") return "timeValue";
  if (normalized === "i") return "interestValue";
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

function optionAliases(label: string): string[] {
  const normalized = normalizeQuantityId(label);
  const compact = normalized.replace(/\s+/g, "");
  const suffix = normalized.match(/\b([a-z0-9]+)$/)?.[1] ?? "";
  return [...new Set([label, normalized, compact, suffix].filter(Boolean))];
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

function reduceIntegerFraction(numerator: number, denominator: number): string {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    return `${numberToText(numerator)}/${numberToText(denominator)}`;
  }
  const divisor = gcd(Math.abs(numerator), Math.abs(denominator));
  return `${numberToText(numerator / divisor)}/${numberToText(denominator / divisor)}`;
}

function gcd(left: number, right: number): number {
  let a = left;
  let b = right;
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function numberToText(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(value).replace(/0+$/, "").replace(/\.$/, "");
}
