import {
  canonicalizeConcept,
  detectCapabilityConflicts,
  normalizeSymbol,
} from "../capabilities/evidence-capability-extractor";
import type {
  CapabilityFact,
  ComparisonSideCapability,
  ConflictCapability,
  ConsequenceCapability,
  EvidenceCapability,
  EvidenceSpan,
  FormulaCapability,
  NumericCapability,
  ProcessCapability,
  RelationCapability,
  SymbolCapability,
} from "../capabilities/types";
import {
  buildValidatedEvidenceUnits,
  indexEducationalCapabilities,
  type AllowedEvidenceUse,
  type CapabilitySupportRef,
} from "../evidence-units/validated-evidence-unit";
import type {
  RequestRequirement,
  RequestRequirements,
} from "../requirements/types";
import type {
  AnswerabilityDecision,
  AnswerabilityRefusalReason,
  RequirementMatch,
  RequirementResult,
  RequirementStatus,
} from "./types";

export type DecideAnswerabilityInput = {
  requestRequirements: RequestRequirements;
  evidenceCapabilities: EvidenceCapability[];
  conflicts?: ConflictCapability[];
};

type MatchContext = {
  request: RequestRequirements;
  evidenceCapabilities: EvidenceCapability[];
  conflicts: ConflictCapability[];
  definitions: CapabilityFact[];
  formulas: FormulaCapability[];
  symbols: SymbolCapability[];
  numerics: NumericCapability[];
  relations: RelationCapability[];
  comparisonSides: ComparisonSideCapability[];
  processes: ProcessCapability[];
  consequences: ConsequenceCapability[];
  evidenceSpansByCapabilityId: Map<string, EvidenceSpan>;
};

export function decideAnswerability(
  input: DecideAnswerabilityInput
): AnswerabilityDecision {
  const scopedEvidence = input.evidenceCapabilities.filter((capability) =>
    evidenceMatchesScope(input.requestRequirements, capability)
  );
  const conflicts = input.conflicts ?? detectCapabilityConflicts(scopedEvidence);
  const context = buildMatchContext(input.requestRequirements, scopedEvidence, conflicts);
  const matches = input.requestRequirements.requirements.flatMap((requirement) =>
    evaluateRequirement(requirement, context)
  );
  const supportRefs = matches.flatMap((match) => match.supportRefs);
  const validatedEvidenceUnits = buildValidatedEvidenceUnits({
    evidenceCapabilities: scopedEvidence,
    supportRefs,
  });
  const unitIdsByRequirement = new Map<string, string[]>();
  for (const unit of validatedEvidenceUnits) {
    for (const requirementId of unit.supportsRequirementIds) {
      unitIdsByRequirement.set(requirementId, [
        ...(unitIdsByRequirement.get(requirementId) ?? []),
        unit.id,
      ]);
    }
  }

  const requirementResults = matches.map<RequirementResult>((match) => ({
    requirementId: match.requirementId,
    status: match.status,
    supportingCapabilityIds: uniqueStrings(
      match.supportRefs.map((ref) => ref.capabilityId)
    ),
    supportingEvidenceUnitIds: unitIdsByRequirement.get(match.requirementId) ?? [],
    missingComponents: uniqueStrings(match.missingComponents),
    conflictIds: uniqueStrings(match.conflictIds),
  }));

  const statusesSupported =
    requirementResults.length > 0 &&
    requirementResults.every((result) => result.status === "SUPPORTED");
  const allSupported =
    statusesSupported &&
    requirementResults.every(
      (result) => result.supportingEvidenceUnitIds.length > 0
    );
  const conflictIds = uniqueStrings(requirementResults.flatMap((result) => result.conflictIds));
  const classification = allSupported ? "SUPPORTED" : "INSUFFICIENT_CONTEXT";

  return {
    classification,
    requirementResults,
    validatedEvidenceUnits: allSupported ? validatedEvidenceUnits : [],
    refusalReason: allSupported
      ? undefined
      : chooseRefusalReason(input.requestRequirements, requirementResults, conflictIds),
    conflictIds: conflictIds.length > 0 ? conflictIds : undefined,
  };
}

function buildMatchContext(
  request: RequestRequirements,
  evidenceCapabilities: EvidenceCapability[],
  conflicts: ConflictCapability[]
): MatchContext {
  return {
    request,
    evidenceCapabilities,
    conflicts,
    definitions: evidenceCapabilities.flatMap((capability) => capability.conceptDefinitions),
    formulas: evidenceCapabilities.flatMap((capability) => capability.formulas),
    symbols: evidenceCapabilities.flatMap((capability) => capability.symbolDefinitions),
    numerics: evidenceCapabilities.flatMap((capability) => capability.numericValues),
    relations: evidenceCapabilities.flatMap((capability) => capability.relations),
    comparisonSides: evidenceCapabilities.flatMap((capability) => capability.comparisonSides),
    processes: evidenceCapabilities.flatMap((capability) => capability.processFacts),
    consequences: evidenceCapabilities.flatMap((capability) => capability.consequences),
    evidenceSpansByCapabilityId: new Map(
      [...indexEducationalCapabilities(evidenceCapabilities)].map(([id, capability]) => [
        id,
        capability.evidenceSpan,
      ])
    ),
  };
}

function evaluateRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch[] {
  if (isActiveSourceBypassRequest(context.request)) {
    return [
      {
        requirementId: requirement.id,
        status: "UNSAFE",
        supportRefs: [],
        missingComponents: ["unsafe source-bypass request"],
        conflictIds: [],
      },
    ];
  }

  const direct = evaluateDirectRequirement(requirement, context);
  if (
    context.request.safetyIntent.asksForCurrentExternalInfo &&
    direct.status === "SUPPORTED" &&
    !hasCurrentExternalSupport(direct, context)
  ) {
    return [
      {
        requirementId: requirement.id,
        status: "MISSING",
        supportRefs: [],
        missingComponents: ["current external information evidence"],
        conflictIds: [],
      },
    ];
  }

  return [direct, ...evaluateChildRequirements(requirement, context)];
}

function evaluateChildRequirements(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch[] {
  return (requirement.childRequirements ?? []).flatMap((child) =>
    evaluateRequirement(child, context)
  );
}

function evaluateDirectRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  if (requirement.kind === "MULTI_PART") {
    return evaluateMultiPartRequirement(requirement, context);
  }

  const relevantConflicts = findRelevantConflicts(requirement, context);
  if (relevantConflicts.length > 0) {
    return buildMatch(requirement.id, "CONFLICTING", [], [], relevantConflicts);
  }

  switch (requirement.kind) {
    case "CONCEPT_DEFINITION":
    case "CONTEXTUAL_FOLLOW_UP":
      return evaluateDefinitionRequirement(requirement, context);
    case "FORMULA":
      return evaluateFormulaRequirement(requirement, context);
    case "FORMULA_WITH_SYMBOLS":
      return evaluateFormulaWithSymbolsRequirement(requirement, context);
    case "SYMBOL_DEFINITION":
      return evaluateSymbolRequirement(requirement, context);
    case "CALCULATION":
      return evaluateCalculationRequirement(requirement, context);
    case "COMPARISON":
      return evaluateComparisonRequirement(requirement, context);
    case "MULTI_OPTION_COMPARISON":
      return evaluateMultiOptionRequirement(requirement, context);
    case "RELATION_MECHANISM_CONSEQUENCE":
      return evaluateRelationRequirement(requirement, context);
    case "PROCESS_EXPLANATION":
      return evaluateProcessRequirement(requirement, context);
  }
}

function evaluateDefinitionRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const targets = canonicalTargetIds(requirement, context.request);
  const supportRefs: CapabilitySupportRef[] = [];
  const missing: string[] = [];

  for (const target of targets) {
    const definition = context.definitions.find(
      (candidate) =>
        candidate.polarity === "POSITIVE" && candidate.canonicalConcept.id === target
    );
    if (!definition) {
      missing.push(`definition:${target}`);
      continue;
    }
    supportRefs.push(supportRef(requirement.id, definition.id, ["DEFINE"]));
  }

  return buildMatchFromMissing(requirement.id, supportRefs, missing);
}

function evaluateFormulaRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const formula = findFormula(requirement, context);
  if (!formula) {
    return buildMatch(requirement.id, "MISSING", [], ["formula"], []);
  }

  return buildMatch(requirement.id, "SUPPORTED", [
    supportRef(requirement.id, formula.id, ["FORMULA"]),
  ]);
}

function evaluateFormulaWithSymbolsRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const formula = findFormula(requirement, context);
  const supportRefs: CapabilitySupportRef[] = [];
  const missing: string[] = [];

  if (formula) {
    supportRefs.push(supportRef(requirement.id, formula.id, ["FORMULA"]));
  } else {
    missing.push("formula");
  }

  for (const symbol of requirement.requiredSymbols ?? []) {
    const normalized = normalizeSymbol(symbol)?.normalized;
    const symbolDefinition = normalized
      ? findPositiveSymbolDefinition(normalized, context)
      : undefined;
    if (symbolDefinition) {
      supportRefs.push(supportRef(requirement.id, symbolDefinition.id, ["SYMBOL"]));
    } else {
      missing.push(`symbol:${symbol}`);
    }
  }

  return buildMatchFromMissing(requirement.id, supportRefs, missing);
}

function evaluateSymbolRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const supportRefs: CapabilitySupportRef[] = [];
  const missing: string[] = [];

  for (const symbol of requirement.requiredSymbols ?? []) {
    const normalized = normalizeSymbol(symbol)?.normalized;
    const symbolDefinition = normalized
      ? findPositiveSymbolDefinition(normalized, context)
      : undefined;
    if (symbolDefinition) {
      supportRefs.push(supportRef(requirement.id, symbolDefinition.id, ["SYMBOL"]));
    } else {
      missing.push(`symbol:${symbol}`);
    }
  }

  return buildMatchFromMissing(requirement.id, supportRefs, missing);
}

function evaluateCalculationRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const supportRefs: CapabilitySupportRef[] = [];
  const missing: string[] = [];
  const formula = findFormula(requirement, context);
  const relation = findRelation(requirement, context);

  if (formula) {
    supportRefs.push(supportRef(requirement.id, formula.id, ["CALCULATE", "FORMULA"]));
  } else if (relation) {
    supportRefs.push(supportRef(requirement.id, relation.id, ["CALCULATE", "RELATION"]));
  } else {
    missing.push("calculation method");
  }

  for (const input of requirement.requiredInputs ?? []) {
    const numeric = findNumericInput(input, context);
    if (numeric) {
      supportRefs.push(supportRef(requirement.id, numeric.id, ["CALCULATE"]));
    } else {
      missing.push(`input:${input}`);
    }
  }

  return buildMatchFromMissing(requirement.id, supportRefs, missing);
}

function evaluateComparisonRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const sides = requirement.comparisonSides?.length
    ? requirement.comparisonSides
    : requirement.targetConcepts;
  const supportRefs: CapabilitySupportRef[] = [];
  const missing: string[] = [];

  for (const side of sides) {
    const sideSupport =
      findComparisonSide(side, context) ?? findDefinitionForConcept(side, context);
    if (sideSupport) {
      supportRefs.push(supportRef(requirement.id, sideSupport.id, ["COMPARE"]));
    } else {
      missing.push(`comparison-side:${side}`);
    }
  }

  return buildMatchFromMissing(requirement.id, supportRefs, missing);
}

function evaluateMultiOptionRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const supportRefs: CapabilitySupportRef[] = [];
  const missing: string[] = [];
  const sides = requirement.comparisonSides ?? [];

  for (const side of sides) {
    const optionValues = context.numerics.filter((numeric) =>
      normalizedText(numeric.qualifier ?? numeric.quantity).includes(normalizedText(side))
    );
    const hasPrice = optionValues.some((numeric) => /price|cost|£|\$|₦/i.test(numeric.quantity));
    const hasQuantity = optionValues.some((numeric) =>
      /quantity|items?|count|number|pack/i.test(numeric.quantity)
    );

    if (hasPrice && hasQuantity) {
      for (const numeric of optionValues.filter((item) =>
        /price|cost|£|\$|₦|quantity|items?|count|number|pack/i.test(item.quantity)
      )) {
        supportRefs.push(supportRef(requirement.id, numeric.id, ["COMPARE", "CALCULATE"]));
      }
    } else {
      missing.push(`option-components:${normalizedText(side)}`);
    }
  }

  return buildMatchFromMissing(requirement.id, supportRefs, missing);
}

function evaluateRelationRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const consequence = findConsequence(requirement, context);
  if (consequence) {
    return buildMatch(requirement.id, "SUPPORTED", [
      supportRef(requirement.id, consequence.id, ["CONSEQUENCE"]),
    ]);
  }

  const relation = findRelation(requirement, context);
  if (relation) {
    return buildMatch(requirement.id, "SUPPORTED", [
      supportRef(requirement.id, relation.id, ["RELATION"]),
    ]);
  }

  return buildMatch(
    requirement.id,
    "MISSING",
    [],
    [requirement.requestedRelation ?? "relation"]
  );
}

function evaluateProcessRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const process = context.processes.find((candidate) =>
    conceptMatches(candidate.process, requirement.targetConcepts, context.request)
  );
  if (!process) {
    return buildMatch(
      requirement.id,
      "MISSING",
      [],
      [requirement.requestedProcess ?? "process"]
    );
  }

  return buildMatch(requirement.id, "SUPPORTED", [
    supportRef(requirement.id, process.id, ["PROCESS"]),
  ]);
}

function evaluateMultiPartRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const children = requirement.childRequirements ?? [];
  if (children.length === 0) {
    return buildMatch(requirement.id, "MISSING", [], ["child requirements"], []);
  }

  const childMatches = children.map((child) => evaluateDirectRequirement(child, context));
  const conflictIds = childMatches.flatMap((match) => match.conflictIds);
  if (conflictIds.length > 0) {
    return buildMatch(requirement.id, "CONFLICTING", [], [], conflictIds);
  }

  const missing = childMatches.flatMap((match) => match.missingComponents);
  if (missing.length > 0) {
    return buildMatch(
      requirement.id,
      "MISSING",
      remapSupportRefs(childMatches.flatMap((match) => match.supportRefs), requirement.id),
      missing
    );
  }

  return buildMatch(
    requirement.id,
    "SUPPORTED",
    remapSupportRefs(childMatches.flatMap((match) => match.supportRefs), requirement.id)
  );
}

function findRelevantConflicts(
  requirement: RequestRequirement,
  context: MatchContext
): string[] {
  const targetIds = canonicalTargetIds(requirement, context.request);
  const normalizedSymbols = (requirement.requiredSymbols ?? [])
    .map((symbol) => normalizeSymbol(symbol)?.normalized)
    .filter((symbol): symbol is string => Boolean(symbol));

  return context.conflicts
    .filter((conflict) => {
      if (
        conflict.conflictType === "DEFINITION_CONFLICT" &&
        targetIds.some((target) => conflict.scopeKey === `definition:${target}`)
      ) {
        return true;
      }
      if (
        conflict.conflictType === "FORMULA_CONFLICT" &&
        (targetIds.some((target) => conflict.scopeKey === `formula:${target}`) ||
          normalizedSymbols.some((symbol) => conflict.scopeKey === `formula:${symbol}`))
      ) {
        return true;
      }
      if (
        conflict.conflictType === "NUMERIC_VALUE_CONFLICT" &&
        requirement.kind === "CALCULATION"
      ) {
        const inputs = requirement.requiredInputs ?? [];
        return (
          targetIds.some((target) => conflict.scopeKey.includes(target)) ||
          inputs.some((input) => {
            const parsed = parseInputValue(input);
            return parsed?.unit ? conflict.scopeKey.includes(parsed.unit) : false;
          })
        );
      }
      if (
        conflict.conflictType === "RELATION_CONFLICT" &&
        requirement.kind === "RELATION_MECHANISM_CONSEQUENCE"
      ) {
        const requested = normalizedText(requirement.requestedRelation ?? "");
        return requested.length > 0 && conflict.scopeKey.includes(requested.split(" ")[0] ?? "");
      }
      return false;
    })
    .map((conflict) => conflict.id);
}

function findFormula(
  requirement: RequestRequirement,
  context: MatchContext
): FormulaCapability | undefined {
  return context.formulas.find((formula) => formulaMatchesRequirement(formula, requirement, context));
}

function formulaMatchesRequirement(
  formula: FormulaCapability,
  requirement: RequestRequirement,
  context: MatchContext
): boolean {
  const targets = canonicalTargetIds(requirement, context.request);
  if (targets.length === 0) return Boolean(formula.outputQuantity);
  if (formula.canonicalConcept && targets.includes(formula.canonicalConcept.id)) return true;
  if (formula.outputQuantity && targets.includes(formula.outputQuantity)) return true;

  const outputSymbol = formula.outputQuantity;
  if (!outputSymbol) return false;
  return [...formula.symbolDefinitions, ...context.symbols].some(
    (definition) =>
      definition.symbol.normalized === outputSymbol &&
      definition.polarity === "POSITIVE" &&
      definition.canonicalConcept &&
      targets.includes(definition.canonicalConcept.id)
  );
}

function findPositiveSymbolDefinition(
  normalizedSymbol: string,
  context: MatchContext
): SymbolCapability | undefined {
  return context.symbols.find(
    (symbol) =>
      symbol.polarity === "POSITIVE" && symbol.symbol.normalized === normalizedSymbol
  );
}

function findNumericInput(
  input: string,
  context: MatchContext
): NumericCapability | undefined {
  const requested = parseInputValue(input);
  if (!requested) return undefined;
  return context.numerics.find(
    (numeric) =>
      numeric.value === requested.value &&
      (!requested.unit || !numeric.unit || normalizedText(numeric.unit) === requested.unit)
  );
}

function findComparisonSide(
  side: string,
  context: MatchContext
): ComparisonSideCapability | undefined {
  const sideId = canonicalizeConcept(side, context.request).id;
  return context.comparisonSides.find((candidate) => {
    const candidateId = canonicalizeConcept(candidate.side, context.request).id;
    return candidate.polarity === "POSITIVE" && candidateId === sideId;
  });
}

function findDefinitionForConcept(
  concept: string,
  context: MatchContext
): CapabilityFact | undefined {
  const conceptId = canonicalizeConcept(concept, context.request).id;
  return context.definitions.find(
    (definition) =>
      definition.polarity === "POSITIVE" && definition.canonicalConcept.id === conceptId
  );
}

function findRelation(
  requirement: RequestRequirement,
  context: MatchContext
): RelationCapability | undefined {
  const requested = normalizedText(requirement.requestedRelation ?? "");
  const targets = canonicalTargetIds(requirement, context.request);
  return context.relations.find((relation) => {
    if (relation.polarity !== "POSITIVE") return false;
    const combined = normalizedText(`${relation.subject} ${relation.relation} ${relation.object}`);
    if (requested.startsWith("conditions for ")) {
      return (
        targets.some((target) => combined.includes(target)) &&
        /causes|cause|leads to|increases|requires|needs/.test(relation.relation)
      );
    }
    if (requested.startsWith("prevention method for ")) {
      return (
        targets.some((target) => combined.includes(target)) &&
        /reduces|decreases|prevents|stops/.test(relation.relation)
      );
    }
    if (requested.length > 0) return includesTokens(combined, requested);
    return targets.some((target) => combined.includes(target));
  });
}

function findConsequence(
  requirement: RequestRequirement,
  context: MatchContext
): ConsequenceCapability | undefined {
  const requested = normalizedText(requirement.requestedRelation ?? "");
  return context.consequences.find((consequence) => {
    if (consequence.polarity !== "POSITIVE") return false;
    const combined = normalizedText(`${consequence.cause} ${consequence.effect}`);
    return requested.length > 0 && includesTokens(combined, requested);
  });
}

function conceptMatches(
  candidate: string,
  targets: string[],
  request: RequestRequirements
): boolean {
  const candidateId = canonicalizeConcept(candidate, request).id;
  return targets.some((target) => canonicalizeConcept(target, request).id === candidateId);
}

function canonicalTargetIds(
  requirement: RequestRequirement,
  request: RequestRequirements
): string[] {
  return uniqueStrings(
    requirement.targetConcepts.map((target) => canonicalizeConcept(target, request).id)
  );
}

function evidenceMatchesScope(
  request: RequestRequirements,
  capability: EvidenceCapability
): boolean {
  if (capability.subjectId !== request.subjectId) return false;
  if (request.topicId && capability.topicId !== request.topicId) return false;
  return true;
}

function supportRef(
  requirementId: string,
  capabilityId: string,
  allowedUses: AllowedEvidenceUse[]
): CapabilitySupportRef {
  return { requirementId, capabilityId, allowedUses };
}

function remapSupportRefs(
  refs: CapabilitySupportRef[],
  requirementId: string
): CapabilitySupportRef[] {
  return refs.map((ref) => ({ ...ref, requirementId }));
}

function buildMatchFromMissing(
  requirementId: string,
  supportRefs: CapabilitySupportRef[],
  missingComponents: string[]
): RequirementMatch {
  return buildMatch(
    requirementId,
    missingComponents.length > 0 ? "MISSING" : "SUPPORTED",
    supportRefs,
    missingComponents
  );
}

function buildMatch(
  requirementId: string,
  status: RequirementStatus,
  supportRefs: CapabilitySupportRef[],
  missingComponents: string[] = [],
  conflictIds: string[] = []
): RequirementMatch {
  return {
    requirementId,
    status,
    supportRefs,
    missingComponents,
    conflictIds,
  };
}

function chooseRefusalReason(
  request: RequestRequirements,
  results: RequirementResult[],
  conflictIds: string[]
): AnswerabilityRefusalReason {
  if (conflictIds.length > 0) return "UNRESOLVED_CONFLICT";
  if (results.some((result) => result.status === "UNSAFE")) return "UNSAFE_REQUEST";
  if (request.safetyIntent.asksForCurrentExternalInfo) {
    return "CURRENT_EXTERNAL_INFO_UNSUPPORTED";
  }
  return "MISSING_REQUIRED_EVIDENCE";
}

function isActiveSourceBypassRequest(request: RequestRequirements): boolean {
  if (!request.safetyIntent.asksToIgnoreSources) return false;
  return !request.requirements.some(hasEducationalRequirementSignal);
}

function hasEducationalRequirementSignal(requirement: RequestRequirement): boolean {
  return (
    requirement.targetConcepts.length > 0 ||
    Boolean(requirement.requiredSymbols?.length) ||
    Boolean(requirement.requiredInputs?.length) ||
    Boolean(requirement.comparisonSides?.length) ||
    Boolean(requirement.requestedProcess) ||
    Boolean(requirement.childRequirements?.some(hasEducationalRequirementSignal))
  );
}

function hasCurrentExternalSupport(
  match: RequirementMatch,
  context: MatchContext
): boolean {
  return match.supportRefs.some((ref) => {
    const span = context.evidenceSpansByCapabilityId.get(ref.capabilityId);
    return span
      ? /\b(latest|current|currently|today|deadline|registration|202\d|203\d|as of)\b/i.test(
          span.text
        )
      : false;
  });
}

function parseInputValue(input: string): { value: number; unit?: string } | undefined {
  const match = input.match(/([-+]?\d+(?:\.\d+)?)\s*([A-Za-z%/²³]+)?/);
  if (!match) return undefined;
  return {
    value: Number(match[1]),
    unit: match[2] ? normalizedText(match[2]) : undefined,
  };
}

function includesTokens(haystack: string, needle: string): boolean {
  const tokens = needle.split(" ").filter((token) => token.length > 2);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}

function normalizedText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9%/²³₦£$]+/g, " ").replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
