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
import {
  semanticComponentMatches,
  canonicalizeSemanticConcept,
  type SemanticComponent,
} from "../semantic-concepts";
import type {
  AnswerabilityDecision,
  AnswerabilityRefusalReason,
  CalculationPath,
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
  explicitFacts: ExplicitFactCapability[];
  methods: MethodCapability[];
  eventFacts: EventCapability[];
  relations: RelationCapability[];
  comparisonSides: ComparisonSideCapability[];
  processes: ProcessCapability[];
  consequences: ConsequenceCapability[];
  passageInterpretations: PassageInterpretationCapability[];
  semanticComponents: SemanticComponent[];
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
  const calculationPaths = input.requestRequirements.requirements.flatMap((requirement) =>
    collectCalculationPaths(requirement, context)
  );
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
    calculationPaths: calculationPaths.length > 0 ? calculationPaths : undefined,
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
    explicitFacts: evidenceCapabilities.flatMap((capability) => capability.explicitFacts),
    methods: evidenceCapabilities.flatMap((capability) => capability.methods),
    eventFacts: evidenceCapabilities.flatMap((capability) => capability.eventFacts),
    relations: evidenceCapabilities.flatMap((capability) => capability.relations),
    comparisonSides: evidenceCapabilities.flatMap((capability) => capability.comparisonSides),
    processes: evidenceCapabilities.flatMap((capability) => capability.processFacts),
    consequences: evidenceCapabilities.flatMap((capability) => capability.consequences),
    passageInterpretations: evidenceCapabilities.flatMap(
      (capability) => capability.passageInterpretations
    ),
    semanticComponents: evidenceCapabilities.flatMap((capability) => capability.semanticComponents),
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

  const semanticMatch = evaluateSemanticComponents(requirement, context);
  if (semanticMatch?.status === "SUPPORTED" && canUseSemanticFastMatch(requirement)) {
    return semanticMatch;
  }
  if (semanticMatch?.status === "MISSING" && hasMandatorySemanticTargetGap(requirement)) {
    return semanticMatch;
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
    case "FACT_LOOKUP":
      return evaluateFactLookupRequirement(requirement, context);
    case "PROCEDURE_METHOD":
      return evaluateProcedureMethodRequirement(requirement, context);
    case "PASSAGE_INTERPRETATION":
      return evaluatePassageInterpretationRequirement(requirement, context);
  }
}

function canUseSemanticFastMatch(requirement: RequestRequirement): boolean {
  if (requirement.kind === "CALCULATION") return false;
  if (
    requirement.kind === "FORMULA_WITH_SYMBOLS" ||
    requirement.kind === "SYMBOL_DEFINITION" ||
    (requirement.kind === "FORMULA" &&
      ((requirement.requiredSymbols?.length ?? 0) > 0 ||
        requirement.requestedAction === "STATE_FORMULA"))
  ) {
    return false;
  }
  if (
    requirement.kind === "FACT_LOOKUP" &&
    /\b(?:variables?|symbols?|units?|kinds?)\b/i.test(requirement.requestedFact ?? "")
  ) {
    return false;
  }
  if (requirement.kind === "CONCEPT_DEFINITION" && requirement.targetConcepts.length > 1) {
    return false;
  }
  if (
    requirement.kind === "RELATION_MECHANISM_CONSEQUENCE" &&
    requirement.requestedFacet === "CONSEQUENCE" &&
    Boolean(requirement.requestedRelation)
  ) {
    return false;
  }
  return true;
}

function evaluateSemanticComponents(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch | undefined {
  const required = requirement.requiredSemanticComponents ?? [];
  if (required.length === 0) return undefined;

  const supportRefs: CapabilitySupportRef[] = [];
  const missing: string[] = [];

  for (const requiredComponent of required) {
    const evidenceComponent = findEvidenceSemanticComponent(requiredComponent, context);
    if (!evidenceComponent?.sourceCapabilityId) {
      missing.push(semanticMissingLabel(requiredComponent));
      continue;
    }
    supportRefs.push(
      supportRef(
        requirement.id,
        evidenceComponent.sourceCapabilityId,
        allowedUsesForSemanticComponent(requiredComponent)
      )
    );
  }

  return buildMatchFromMissing(requirement.id, supportRefs, missing);
}

function findEvidenceSemanticComponent(
  requiredComponent: SemanticComponent,
  context: MatchContext
): SemanticComponent | undefined {
  return context.semanticComponents.find((candidate) => {
    if (semanticComponentMatches(requiredComponent, candidate)) return true;
    if (
      requiredComponent.kind === "COMPARISON_SIDE" &&
      requiredComponent.concept &&
      candidate.concept?.baseConcept === requiredComponent.concept.baseConcept
    ) {
      return ["DEFINITION", "RELATION", "PROCESS", "FORMULA", "FUNCTION", "PURPOSE", "COMPARISON_SIDE"].includes(candidate.kind);
    }
    return false;
  });
}

function allowedUsesForSemanticComponent(component: SemanticComponent): AllowedEvidenceUse[] {
  switch (component.kind) {
    case "FORMULA":
      return ["FORMULA"];
    case "SYMBOL":
      return ["SYMBOL"];
    case "QUANTITY":
      return ["CALCULATE"];
    case "METHOD":
      return ["PROCESS", "CALCULATE"];
    case "COMPARISON_SIDE":
      return ["COMPARE"];
    case "PROCESS":
      return ["PROCESS"];
    case "RELATION":
    case "FUNCTION":
      return ["RELATION"];
    case "CONSEQUENCE":
      return ["CONSEQUENCE"];
    case "LIMITATION":
    case "PURPOSE":
    case "UNIT":
    case "DEFINITION":
    case "EXPLICIT_FACT":
    case "PASSAGE_INTERPRETATION":
    default:
      return ["DEFINE"];
  }
}

function semanticMissingLabel(component: SemanticComponent) {
  return [
    component.kind.toLowerCase(),
    component.concept?.baseConcept,
    component.symbol,
    component.relation,
    component.object,
  ].filter(Boolean).join(":") || component.kind.toLowerCase();
}

function hasMandatorySemanticTargetGap(requirement: RequestRequirement) {
  if (requirement.kind === "SYMBOL_DEFINITION") return false;
  return (requirement.requiredSemanticComponents ?? []).some(
    (component) =>
      ["FORMULA", "PROCESS", "PURPOSE", "UNIT", "SYMBOL"].includes(component.kind) &&
      !component.concept?.baseConcept &&
      !component.symbol
  );
}

function evaluateDefinitionRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const targets = canonicalTargetIds(requirement, context.request);
  if (targets.length === 0) {
    return buildMatch(requirement.id, "MISSING", [], ["definition target"], []);
  }

  const supportRefs: CapabilitySupportRef[] = [];
  const missing: string[] = [];

  for (const target of targets) {
    const definition = context.definitions.find(
      (candidate) =>
        candidate.polarity === "POSITIVE" && candidate.canonicalConcept.id === target
    );
    if (!definition) {
      const formula = context.formulas.find(
        (candidate) =>
          candidate.canonicalConcept?.id === target || candidate.outputQuantity === target
      );
      if (formula) {
        supportRefs.push(supportRef(requirement.id, formula.id, ["DEFINE", "FORMULA"]));
      } else {
        missing.push(`definition:${target}`);
      }
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
      ? findPositiveSymbolDefinitionForRequirement(normalized, requirement, formula, context)
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
  const formula = requirement.formulaContext ? findFormula(requirement, context) : undefined;

  if (requirement.formulaContext) {
    if (formula) {
      supportRefs.push(supportRef(requirement.id, formula.id, ["FORMULA"]));
    } else {
      missing.push("formula");
    }
  }

  for (const symbol of requirement.requiredSymbols ?? []) {
    const normalized = normalizeSymbol(symbol)?.normalized;
    const symbolDefinition = normalized
      ? findPositiveSymbolDefinitionForRequirement(normalized, requirement, formula, context)
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
  const boundedProbabilitySupport = findBoundedProbabilityCalculationSupport(
    requirement,
    context
  );
  if (boundedProbabilitySupport.length > 0) {
    return buildMatch(requirement.id, "SUPPORTED", boundedProbabilitySupport);
  }

  const paths = buildCalculationPaths(requirement, context);
  const completePath = paths.find((path) => path.complete);
  if (!completePath) {
    const explicitInputFallback = findExplicitInputCalculationSupport(requirement, context);
    if (explicitInputFallback.length > 0) {
      return buildMatch(requirement.id, "SUPPORTED", explicitInputFallback);
    }

    const missing = paths.length > 0
      ? uniqueStrings(
          paths.flatMap((path) =>
            path.requiredInputs
              .filter((input) =>
                !path.availableInputs.some((available) =>
                  semanticComponentMatches(input, available)
                )
              )
              .map(calculationInputMissingLabel)
          )
        )
      : ["calculation method"];

    return buildMatch(requirement.id, "MISSING", [], missing, []);
  }

  const supportRefs = uniqueSupportRefs([
    supportRef(requirement.id, completePath.formulaCapabilityId, ["CALCULATE", "FORMULA"]),
    ...completePath.availableInputs
      .map((input) => input.sourceCapabilityId)
      .filter((id): id is string => Boolean(id))
      .map((id) => supportRef(requirement.id, id, ["CALCULATE"])),
  ]);

  return buildMatch(requirement.id, "SUPPORTED", supportRefs);
}

function findExplicitInputCalculationSupport(
  requirement: RequestRequirement,
  context: MatchContext
): CapabilitySupportRef[] {
  const explicitInputs = requirement.requiredInputs ?? [];
  if (explicitInputs.length === 0 || (requirement.requiredInputConcepts ?? []).length > 0) {
    return [];
  }
  const calculationFact = findCalculationFact(requirement, context);
  if (!calculationFact) return [];

  const inputNumerics = explicitInputs
    .map((input) => findNumericInput(input, context))
    .filter((numeric): numeric is NumericCapability => Boolean(numeric));
  if (inputNumerics.length !== explicitInputs.length) return [];

  return uniqueSupportRefs([
    supportRef(requirement.id, calculationFact.id, ["CALCULATE"]),
    ...inputNumerics.map((numeric) => supportRef(requirement.id, numeric.id, ["CALCULATE"])),
  ]);
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
    const sideSupport = isMethodSelectionRequirement(requirement)
      ? findMethodSelectionSideSupport(side, requirement, context)
      : findComparisonSide(side, context) ??
        findDefinitionForConcept(side, context) ??
        findSemanticComparisonSideSupport(side, requirement, context);
    if (sideSupport) {
      supportRefs.push(supportRef(requirement.id, sideSupport.id, ["COMPARE"]));
    } else {
      missing.push(`comparison-side:${side}`);
    }
  }

  return buildMatchFromMissing(requirement.id, supportRefs, missing);
}

function findSemanticComparisonSideSupport(
  side: string,
  requirement: RequestRequirement,
  context: MatchContext
): { id: string } | undefined {
  const sideId = canonicalizeConcept(side, context.request).id;
  const component = context.semanticComponents.find((candidate) => {
    if (!candidate.sourceCapabilityId || candidate.concept?.baseConcept !== sideId) {
      return false;
    }
    return ["DEFINITION", "RELATION", "PROCESS", "FORMULA", "FUNCTION", "PURPOSE", "COMPARISON_SIDE"].includes(candidate.kind);
  });
  if (component?.sourceCapabilityId) return { id: component.sourceCapabilityId };

  return [
    ...context.relations,
    ...context.processes,
    ...context.methods,
    ...context.explicitFacts,
  ].find((candidate) => {
    const text = "subject" in candidate
      ? `${candidate.subject} ${candidate.relation} ${candidate.object}`
      : "process" in candidate
        ? `${candidate.process} ${candidate.fact}`
        : "method" in candidate
          ? `${candidate.method} ${candidate.stepsText}`
          : `${candidate.factKey} ${candidate.factText}`;
    const candidateSideId = canonicalizeConcept(
      "subject" in candidate
        ? candidate.subject
        : "process" in candidate
          ? candidate.process
          : "method" in candidate
            ? candidate.method
            : candidate.canonicalConcept?.label ?? candidate.factKey,
      context.request
    ).id;
    return candidateSideId === sideId && normalizedText(text).length > 0;
  });
}

function isMethodSelectionRequirement(requirement: RequestRequirement): boolean {
  return (
    requirement.requestedAction === "SELECT_METHOD" ||
    (requirement.constraints ?? []).includes("method selection")
  );
}

function findMethodSelectionSideSupport(
  side: string,
  requirement: RequestRequirement,
  context: MatchContext
): { id: string } | undefined {
  const sideId = canonicalizeConcept(side, context.request).id;
  const semanticSupport = context.semanticComponents.find((candidate) => {
    if (!candidate.sourceCapabilityId || candidate.concept?.baseConcept !== sideId) {
      return false;
    }
    return ["METHOD", "PROCESS", "RELATION", "LIMITATION", "CONSEQUENCE"].includes(
      candidate.kind
    );
  });
  if (semanticSupport?.sourceCapabilityId) {
    return { id: semanticSupport.sourceCapabilityId };
  }

  const method = context.methods.find(
    (candidate) =>
      candidate.canonicalConcept?.id === sideId ||
      canonicalizeConcept(candidate.method, context.request).id === sideId
  );
  if (method) return { id: method.id };

  const process = context.processes.find(
    (candidate) => canonicalizeConcept(candidate.process, context.request).id === sideId
  );
  if (process) return { id: process.id };

  const definition = findDefinitionForConcept(side, context);
  if (
    definition &&
    /\b(?:can|used|use|separates?|recover|when|from|by|limitation|cannot|can not)\b/i.test(
      definition.definitionText
    )
  ) {
    return { id: definition.id };
  }

  return undefined;
}

function evaluateMultiOptionRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const supportRefs: CapabilitySupportRef[] = [];
  const missing: string[] = [];
  const sides = requirement.comparisonSides ?? [];
  const optionGroups = buildNumericOptionGroups(context.numerics);

  if (usesPlaceholderOptions(sides)) {
    const completeGroups = optionGroups.filter((group) => group.price && group.quantity);
    for (const group of completeGroups) {
      if (group.price) supportRefs.push(supportRef(requirement.id, group.price.id, ["COMPARE", "CALCULATE"]));
      if (group.quantity) supportRefs.push(supportRef(requirement.id, group.quantity.id, ["COMPARE", "CALCULATE"]));
    }
    if (completeGroups.length < Math.max(2, sides.length)) {
      missing.push(`option-components:${completeGroups.length + 1}`);
    }
    return buildMatchFromMissing(requirement.id, supportRefs, missing);
  }

  for (const side of sides) {
    const optionValues = optionGroups.find((group) =>
      group.label.includes(normalizedText(side))
    );

    if (optionValues?.price && optionValues.quantity) {
      supportRefs.push(
        supportRef(requirement.id, optionValues.price.id, ["COMPARE", "CALCULATE"]),
        supportRef(requirement.id, optionValues.quantity.id, ["COMPARE", "CALCULATE"])
      );
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
    const definition = findDefinitionProcessFallback(requirement, context);
    if (definition) {
      return buildMatch(requirement.id, "SUPPORTED", [
        supportRef(requirement.id, definition.id, ["DEFINE", "PROCESS"]),
      ]);
    }

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

function findDefinitionProcessFallback(
  requirement: RequestRequirement,
  context: MatchContext
): CapabilityFact | undefined {
  const targetIds = canonicalTargetIds(requirement, context.request);
  if (!targetIds.includes("current")) return undefined;
  return requirement.targetConcepts
    .map((target) => findDefinitionForConcept(target, context))
    .find(Boolean);
}

function evaluateFactLookupRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const formulaVariableSupport = findFormulaVariableSupport(requirement, context);
  if (formulaVariableSupport.length > 0) {
    return buildMatch(requirement.id, "SUPPORTED", formulaVariableSupport);
  }

  const unitSupport = findUnitFactSupport(requirement, context);
  if (unitSupport.length > 0) {
    return buildMatch(requirement.id, "SUPPORTED", unitSupport);
  }

  const explanationContextSupport = findExplanationContextSupport(requirement, context);
  if (explanationContextSupport.length > 0) {
    return buildMatch(requirement.id, "SUPPORTED", explanationContextSupport);
  }

  const event = findEventFact(requirement, context);
  if (event) {
    return buildMatch(requirement.id, "SUPPORTED", [
      supportRef(requirement.id, event.id, ["CALCULATE", "DEFINE"]),
    ]);
  }

  const fact = findExplicitFact(requirement, context);
  if (fact) {
    return buildMatch(requirement.id, "SUPPORTED", [
      supportRef(requirement.id, fact.id, ["DEFINE"]),
    ]);
  }

  const definitionFact = findDefinitionFact(requirement, context);
  if (definitionFact) {
    return buildMatch(requirement.id, "SUPPORTED", [
      supportRef(requirement.id, definitionFact.id, ["DEFINE"]),
    ]);
  }

  return buildMatch(
    requirement.id,
    "MISSING",
    [],
    [requirement.requestedFact ?? requirement.requestedEvent ?? "explicit fact"]
  );
}

function evaluateProcedureMethodRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const method = findMethod(requirement, context);
  if (method) {
    return buildMatch(requirement.id, "SUPPORTED", [
      supportRef(requirement.id, method.id, ["PROCESS", "CALCULATE"]),
    ]);
  }

  const process = context.processes.find((candidate) =>
    requirement.requestedMethod
      ? semanticTextMatches(
          `${candidate.process} ${candidate.fact}`,
          requirement.requestedMethod
        )
      : conceptMatches(candidate.process, requirement.targetConcepts, context.request)
  );
  if (process) {
    return buildMatch(requirement.id, "SUPPORTED", [
      supportRef(requirement.id, process.id, ["PROCESS"]),
    ]);
  }

  const workedExampleSupport = findWorkedExampleSupport(requirement, context);
  if (workedExampleSupport.length > 0) {
    return buildMatch(requirement.id, "SUPPORTED", workedExampleSupport);
  }

  return buildMatch(
    requirement.id,
    "MISSING",
    [],
    [requirement.requestedMethod ?? "method"]
  );
}

function evaluatePassageInterpretationRequirement(
  requirement: RequestRequirement,
  context: MatchContext
): RequirementMatch {
  const interpretation = context.passageInterpretations.find((candidate) => {
    if (requirement.passageTask && candidate.interpretationType !== requirement.passageTask) {
      return false;
    }
    const requested = normalizedText(
      `${requirement.requestedFact ?? ""} ${requirement.targetConcepts.join(" ")}`
    );
    if (!requested) return true;
    return semanticTextMatches(
      `${candidate.targetText ?? ""} ${candidate.interpretationText} ${candidate.evidenceSpan.text}`,
      requested
    );
  });
  if (interpretation) {
    return buildMatch(requirement.id, "SUPPORTED", [
      supportRef(requirement.id, interpretation.id, ["DEFINE"]),
    ]);
  }

  const definition = requirement.targetConcepts
    .map((target) => findDefinitionForConcept(target, context))
    .find(Boolean);
  if (definition) {
    return buildMatch(requirement.id, "SUPPORTED", [
      supportRef(requirement.id, definition.id, ["DEFINE"]),
    ]);
  }

  return buildMatch(
    requirement.id,
    "MISSING",
    [],
    [requirement.requestedFact ?? requirement.passageTask ?? "passage interpretation"]
  );
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

function buildNumericOptionGroups(numerics: NumericCapability[]) {
  const groups = new Map<
    string,
    {
      label: string;
      price?: NumericCapability;
      quantity?: NumericCapability;
    }
  >();

  for (const numeric of numerics) {
    const label = normalizedText(numeric.qualifier ?? optionLabelFromQuantity(numeric.quantity));
    if (!label) continue;
    const existing = groups.get(label) ?? { label };
    if (numeric.role === "PRICE" || /price|cost|charge|fee|fare|£|\$|₦|naira|ngn/i.test(numeric.quantity)) {
      existing.price = numeric;
    }
    if (
      numeric.role === "QUANTITY" ||
      /quantity|items?|count|number|pack|pens?|bottles?|pages?|gb|miles?|kilometres?|kilometers?/i.test(
        `${numeric.quantity} ${numeric.unit ?? ""}`
      )
    ) {
      existing.quantity = numeric;
    }
    groups.set(label, existing);
  }

  return [...groups.values()].sort((left, right) => left.label.localeCompare(right.label));
}

function optionLabelFromQuantity(quantity: string) {
  const match = normalizedText(quantity).match(
    /\b((?:option|pack|crate|plan|shop|bundle|ticket)\s+[a-z0-9]+)\b/
  );
  return match?.[1] ?? "";
}

function usesPlaceholderOptions(sides: string[]) {
  return (
    sides.length === 0 ||
    sides.every((side) => /^option\s+\d+$/i.test(normalizedText(side)))
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
        (targetIds.some((target) => conflict.scopeKey === `definition:${target}`) ||
          (isFormulaRequirement(requirement) &&
            targetIds.length === 0 &&
            conflict.scopeKey.startsWith("definition:")))
      ) {
        return true;
      }
      if (
        conflict.conflictType === "FORMULA_CONFLICT" &&
        ((isFormulaRequirement(requirement) &&
          targetIds.length === 0 &&
          normalizedSymbols.length === 0) ||
          targetIds.some((target) => formulaConflictScopeMatches(conflict.scopeKey, target)) ||
          normalizedSymbols.some((symbol) => formulaConflictScopeMatches(conflict.scopeKey, symbol)))
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
      if (
        conflict.conflictType === "EXPLICIT_FACT_CONFLICT" &&
        (requirement.kind === "FACT_LOOKUP" || requirement.kind === "CONCEPT_DEFINITION")
      ) {
        const requested = normalizedText(
          `${requirement.requestedFact ?? ""} ${requirement.targetConcepts.join(" ")}`
        );
        return (
          (conflict.scopeKey === "fact:answer" && /\banswer\b/.test(requested)) ||
          (conflict.scopeKey === "fact:identifier" && /\bidentifier|question\b/.test(requested))
        );
      }
      return false;
    })
    .map((conflict) => conflict.id);
}

function formulaConflictScopeMatches(scopeKey: string, target: string): boolean {
  return scopeKey === `formula:${target}` || scopeKey.startsWith(`formula:${target}:`) || scopeKey.endsWith(`:${target}`);
}

function isFormulaRequirement(requirement: RequestRequirement): boolean {
  return (
    requirement.kind === "FORMULA" ||
    requirement.kind === "FORMULA_WITH_SYMBOLS" ||
    requirement.kind === "CALCULATION"
  );
}

function findFormula(
  requirement: RequestRequirement,
  context: MatchContext
): FormulaCapability | undefined {
  const explicitFormulaContext = requirement.formulaContext;
  if (explicitFormulaContext) {
    return context.formulas.find((formula) =>
      formulaMatchesExplicitContext(formula, explicitFormulaContext)
    );
  }
  return context.formulas.find((formula) => formulaMatchesRequirement(formula, requirement, context));
}

export function buildCalculationPathsForTest(
  requirement: RequestRequirement,
  input: DecideAnswerabilityInput
): CalculationPath[] {
  const scopedEvidence = input.evidenceCapabilities.filter((capability) =>
    evidenceMatchesScope(input.requestRequirements, capability)
  );
  const conflicts = input.conflicts ?? detectCapabilityConflicts(scopedEvidence);
  return buildCalculationPaths(
    requirement,
    buildMatchContext(input.requestRequirements, scopedEvidence, conflicts)
  );
}

function collectCalculationPaths(
  requirement: RequestRequirement,
  context: MatchContext
): CalculationPath[] {
  const direct = requirement.kind === "CALCULATION"
    ? buildCalculationPaths(requirement, context)
    : [];
  return [
    ...direct,
    ...(requirement.childRequirements ?? []).flatMap((child) =>
      collectCalculationPaths(child, context)
    ),
  ];
}

function buildCalculationPaths(
  requirement: RequestRequirement,
  context: MatchContext
): CalculationPath[] {
  if (requirement.kind !== "CALCULATION") return [];
  return candidateCalculationFormulas(requirement, context).map((formula) => {
    const outputConcept = inferCalculationOutputConcept(requirement, formula, context);
    const requiredInputConcepts = inferRequiredCalculationInputConcepts(
      requirement,
      formula,
      outputConcept,
      context
    );
    const requiredInputs = requiredInputConcepts.map((concept) =>
      makeCalculationInputComponent(concept, requirement)
    );
    const availableInputs = requiredInputs
      .map((input) => {
        const numeric = findNumericForInputComponent(input, context);
        return numeric ? availableInputFromNumeric(input, numeric) : undefined;
      })
      .filter((input): input is SemanticComponent => Boolean(input));
    return {
      requirementId: requirement.id,
      formulaCapabilityId: formula.id,
      outputConcept,
      requiredInputs,
      availableInputs,
      complete: requiredInputs.every((input) =>
        availableInputs.some((available) => semanticComponentMatches(input, available))
      ),
    };
  });
}

function availableInputFromNumeric(
  input: SemanticComponent,
  numeric: NumericCapability
): SemanticComponent {
  return {
    ...input,
    value: numeric.value,
    unit: numeric.unit,
    text: numeric.evidenceSpan.text,
    sourceCapabilityId: numeric.id,
    resourceChunkId: numeric.resourceChunkId,
    sourceLabel: numeric.sourceLabel,
  };
}

function candidateCalculationFormulas(
  requirement: RequestRequirement,
  context: MatchContext
): FormulaCapability[] {
  const direct = context.formulas.filter((formula) =>
    formulaMatchesRequirement(formula, requirement, context)
  );
  if (direct.length > 0) return direct;

  const targetIds = canonicalTargetIds(requirement, context.request);
  if (targetIds.length === 0) return context.formulas;
  return context.formulas.filter((formula) => {
    const formulaText = normalizedText(
      `${formula.canonicalConcept?.id ?? ""} ${formula.canonicalConcept?.label ?? ""} ${
        formula.expression
      } ${formula.outputQuantity ?? ""}`
    );
    return targetIds.some((target) => formulaText.includes(target.replace(/-/g, " ")));
  });
}

function inferCalculationOutputConcept(
  requirement: RequestRequirement,
  formula: FormulaCapability,
  context: MatchContext
): string {
  return (
    canonicalTargetIds(requirement, context.request)[0] ??
    formula.canonicalConcept?.id ??
    canonicalizeConcept(formula.outputQuantity ?? "calculation", context.request).id
  );
}

function inferRequiredCalculationInputConcepts(
  requirement: RequestRequirement,
  formula: FormulaCapability,
  outputConcept: string,
  context: MatchContext
): string[] {
  const explicit = (requirement.requiredInputConcepts ?? [])
    .map((input) => canonicalizeConcept(input, context.request).id);
  const byOutput = calculationInputConceptsForOutput(outputConcept);
  if (explicit.length > 0) return uniqueStrings([...byOutput, ...explicit]);
  if (byOutput.length > 0) return byOutput;

  const formulaText = normalizedText(
    `${formula.expression} ${formula.requiredInputs.join(" ")} ${formula.symbolDefinitions
      .map((symbol) => symbol.meaning ?? "")
      .join(" ")}`
  );
  const byFormulaText = calculationInputConceptsFromText(formulaText);
  if (byFormulaText.length > 0) return byFormulaText;

  return uniqueStrings(
    formula.requiredInputs
      .map((input) =>
        formula.symbolDefinitions.find((symbol) => symbol.symbol.normalized === input)
          ?.canonicalConcept?.id ?? canonicalizeConcept(input, context.request).id
      )
      .filter((input) => input !== outputConcept)
  );
}

function calculationInputConceptsForOutput(outputConcept: string): string[] {
  const map: Record<string, string[]> = {
    speed: ["distance", "time"],
    density: ["mass", "volume"],
    pressure: ["force", "area"],
    force: ["mass", "acceleration"],
    power: ["voltage", "current"],
    "simple-interest": ["principal", "rate", "time"],
    "percentage-change": ["change", "original-value"],
    percentage: ["change", "original-value"],
    probability: ["favourable-outcomes", "total-outcomes"],
  };
  return map[outputConcept] ?? [];
}

function calculationInputConceptsFromText(text: string): string[] {
  return uniqueStrings(
    [
      ["distance", /\bdistance\b|\bmet(?:er|re)s?\b/],
      ["time", /\btime\b|\bseconds?\b|\bminutes?\b|\bhours?\b|\byears?\b/],
      ["mass", /\bmass\b|\bkilograms?\b|\bgrams?\b/],
      ["volume", /\bvolume\b|\bcm3\b|\bcm²\b|\bcm³\b|\bm3\b|\blitres?\b|\bliters?\b/],
      ["force", /\bforce\b|\bnewtons?\b/],
      ["area", /\barea\b/],
      ["voltage", /\bvoltage\b|\bvolts?\b/],
      ["current", /\bcurrent\b|\bamperes?\b|\bamps?\b/],
      ["acceleration", /\bacceleration\b|\bm\/s2\b|\bm\/s²\b/],
      ["principal", /\bprincipal\b/],
      ["rate", /\brate\b|\bpercent\b|%/],
      ["favourable-outcomes", /\bfavou?rable\s+outcomes?\b/],
      ["total-outcomes", /\btotal\b.{0,30}\boutcomes?\b|\bpossible\s+outcomes?\b/],
      ["change", /\bchange\b/],
      ["original-value", /\boriginal\s+value\b|\boriginal\b/],
    ]
      .filter(([, pattern]) => (pattern as RegExp).test(text))
      .map(([concept]) => concept as string)
  );
}

function makeCalculationInputComponent(
  conceptId: string,
  requirement: RequestRequirement
): SemanticComponent {
  return {
    kind: "QUANTITY",
    concept: canonicalizeSemanticConcept({
      rawConcept: calculationConceptAlias(conceptId),
      subjectId: requirement.subjectId,
      topicId: requirement.topicId,
      facet: undefined,
    }),
    text: conceptId,
  };
}

function findNumericForInputComponent(
  input: SemanticComponent,
  context: MatchContext
): NumericCapability | undefined {
  return context.numerics.find((numeric) => numericMatchesInputComponent(numeric, input));
}

function numericMatchesInputComponent(
  numeric: NumericCapability,
  input: SemanticComponent
): boolean {
  if (input.concept && numeric.canonicalConcept?.id === input.concept.baseConcept) {
    return true;
  }
  const inputId = input.concept?.baseConcept ?? "";
  const aliases = input.concept?.aliases ?? [];
  const text = normalizedText(
    `${numeric.quantity} ${numeric.qualifier ?? ""} ${numeric.unit ?? ""} ${numeric.evidenceSpan.text} ${
      numeric.canonicalConcept?.label ?? ""
    } ${numeric.canonicalConcept?.aliases.join(" ") ?? ""}`
  );
  if (aliases.some((alias) => includesTokens(text, normalizedText(alias)))) return true;
  return unitImpliesConcept(numeric.unit, inputId, text);
}

function calculationConceptAlias(conceptId: string): string {
  const aliases: Record<string, string> = {
    "original-value": "original value",
    "percentage-change": "percentage change",
    "simple-interest": "simple interest",
  };
  return aliases[conceptId] ?? conceptId.replace(/-/g, " ");
}

function unitImpliesConcept(unit: string | undefined, conceptId: string, text: string): boolean {
  const normalizedUnit = normalizedText(unit ?? "");
  if (!normalizedUnit && !text) return false;
  switch (conceptId) {
    case "distance":
      return unitMatches(normalizedUnit, ["metres?", "meters?", "m", "km", "kilometres?", "kilometers?"]) &&
        !/[/%]/.test(normalizedUnit);
    case "time":
      return unitMatches(normalizedUnit, ["seconds?", "secs?", "s", "minutes?", "mins?", "hours?", "years?"]) ||
        /\btime\b/.test(text);
    case "mass":
      return unitMatches(normalizedUnit, ["kg", "kilograms?", "g", "grams?"]);
    case "volume":
      return unitMatches(normalizedUnit, ["cm3", "cm³", "m3", "m³", "litres?", "liters?", "l"]) ||
        /\bvolume\b/.test(text);
    case "current":
      return unitMatches(normalizedUnit, ["a", "amps?", "amperes?"]) || /\bcurrent\b/.test(text);
    case "voltage":
      return unitMatches(normalizedUnit, ["v", "volts?"]) || /\bvoltage\b|\bpotential difference\b/.test(text);
    case "force":
      return unitMatches(normalizedUnit, ["n", "newtons?"]) || /\bforce\b/.test(text);
    case "acceleration":
      return /\bm\/s2|m\/s²\b/.test(normalizedUnit) || /\bacceleration\b/.test(text);
    case "rate":
      return /\bpercent\b|%/.test(normalizedUnit) || /\brate\b/.test(text);
    case "principal":
      return /\bprincipal\b|\bp\s+is\b/.test(text);
    case "change":
      return /\bchange\b/.test(text) && !/\boriginal\b/.test(text);
    case "original-value":
      return /\boriginal\s+value\b|\boriginal\b/.test(text);
    default:
      return false;
  }
}

function unitMatches(unit: string, alternatives: string[]): boolean {
  return alternatives.some((alternative) =>
    new RegExp(`^(?:${alternative})$`, "i").test(unit)
  );
}

function calculationInputMissingLabel(input: SemanticComponent) {
  return `input:${input.concept?.baseConcept ?? input.text ?? "unknown"}`;
}

function formulaMatchesRequirement(
  formula: FormulaCapability,
  requirement: RequestRequirement,
  context: MatchContext
): boolean {
  if (requirement.formulaContext) {
    return formulaMatchesExplicitContext(formula, requirement.formulaContext);
  }

  const targets = canonicalTargetIds(requirement, context.request);
  if (targets.length === 0) {
    return (
      isFormulaRequirement(requirement) &&
      context.formulas.length === 1 &&
      (requirement.requiredSymbols?.length ?? 0) === 0
    );
  }
  if (formula.canonicalConcept && targets.includes(formula.canonicalConcept.id)) return true;
  if (formula.outputQuantity && targets.includes(formula.outputQuantity)) return true;
  if (formula.outputQuantity && formulaOutputImpliesTarget(formula.outputQuantity, targets)) {
    return true;
  }

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

function formulaOutputImpliesTarget(outputQuantity: string, targets: string[]): boolean {
  const aliases: Record<string, string[]> = {
    f: ["force"],
    p: ["power", "pressure"],
    v: ["voltage"],
    i: ["current"],
    r: ["resistance"],
    a: ["acceleration"],
  };
  return (aliases[normalizedText(outputQuantity)] ?? []).some((alias) =>
    targets.includes(alias)
  );
}

function formulaVariableTerms(formula: FormulaCapability): string[] {
  const expressionTerms = toSemanticTokens(formula.expression).filter((token) => {
    if (/^\d+$/.test(token)) return false;
    if (["area", "force", "power", "voltage", "density", "speed"].includes(token)) {
      return false;
    }
    return token.length > 1;
  });
  const inputTerms = formula.requiredInputs.map(normalizedText).filter(Boolean);
  const symbolMeaningTerms = formula.symbolDefinitions.flatMap((symbol) =>
    toSemanticTokens(symbol.meaning ?? "")
  );
  return uniqueStrings([...expressionTerms, ...inputTerms, ...symbolMeaningTerms]);
}

function findPositiveSymbolDefinitionForRequirement(
  normalizedSymbol: string,
  requirement: RequestRequirement,
  formula: FormulaCapability | undefined,
  context: MatchContext
): SymbolCapability | undefined {
  if (!requirement.formulaContext) {
    return findPositiveSymbolDefinition(normalizedSymbol, context);
  }
  if (!formula) return undefined;
  return findPositiveSymbolDefinitionInFormulaContext(normalizedSymbol, formula, context);
}

function findPositiveSymbolDefinitionInFormulaContext(
  normalizedSymbol: string,
  formula: FormulaCapability,
  context: MatchContext
): SymbolCapability | undefined {
  const local = formula.symbolDefinitions.find(
    (symbol) =>
      symbol.polarity === "POSITIVE" && symbol.symbol.normalized === normalizedSymbol
  );
  if (local) return local;

  const formulaHasSymbol = formula.symbols.some(
    (symbol) => symbol.normalized === normalizedSymbol
  );
  if (!formulaHasSymbol) return undefined;

  const sameScope = context.symbols.filter(
    (symbol) =>
      symbol.polarity === "POSITIVE" &&
      symbol.symbol.normalized === normalizedSymbol &&
      symbol.resourceChunkId === formula.resourceChunkId &&
      symbol.sourceLabel === formula.sourceLabel
  );
  const explicitlyLinked = sameScope.find(
    (symbol) =>
      symbol.formulaContext &&
      symbol.formulaContext.formulaCapabilityId === formula.id &&
      symbol.formulaContext.normalizedExpression === formula.normalizedExpression
  );
  if (explicitlyLinked) return explicitlyLinked;

  const formulasInScope = context.formulas.filter(
    (candidate) =>
      candidate.resourceChunkId === formula.resourceChunkId &&
      candidate.sourceLabel === formula.sourceLabel
  );
  if (formulasInScope.length === 1) return sameScope[0];

  return undefined;
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

function formulaMatchesExplicitContext(
  formula: FormulaCapability,
  formulaContext: string
): boolean {
  const requested = normalizeFormulaExpressionForMatch(formulaContext);
  if (!requested) return false;
  const candidate = normalizeFormulaExpressionForMatch(formula.expression);
  if (candidate === requested) return true;

  const [requestedLeft, requestedRight] = requested.split("=");
  const [candidateLeft, candidateRight] = candidate.split("=");
  if (!requestedLeft || !requestedRight || !candidateLeft || !candidateRight) {
    return false;
  }
  if (requestedLeft !== candidateLeft) return false;

  const requestedTerms = formulaSideTerms(requestedRight);
  const candidateTerms = formulaSideTerms(candidateRight);
  return (
    requestedTerms.length > 0 &&
    requestedTerms.length === candidateTerms.length &&
    requestedTerms.every((term) => candidateTerms.includes(term))
  );
}

function normalizeFormulaExpressionForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/π/g, "pi")
    .replace(/[×·]/g, " * ")
    .replace(/[÷]/g, " / ")
    .replace(/[^a-z0-9\u0370-\u03ff=/*+\-²³\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\brho\b/g, "ρ")
    .replace(/\blambda\b/g, "λ")
    .replace(/\btheta\b/g, "θ")
    .replace(/\balpha\b/g, "α")
    .replace(/\bbeta\b/g, "β")
    .replace(/\bgamma\b/g, "γ")
    .replace(/\bpi\b/g, "π")
    .replace(/\bdelta\b/g, "δ")
    .replace(/\s*\b(?:x|times|multiply|multiplied by)\b\s*/g, "*")
    .replace(/\s*(?:\b(?:over|divided by)\b|\/)\s*/g, "/")
    .replace(/\s*=\s*/g, "=")
    .replace(/\s+/g, "");
}

function formulaSideTerms(value: string): string[] {
  return uniqueStrings(
    [...value.matchAll(/[a-zα-ω]+|\d+(?:\.\d+)?/gi)]
      .map((match) => normalizedText(match[0] ?? ""))
      .filter((token) => token.length > 0 && !/^\d/.test(token))
  ).sort();
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
    const causeTarget = requirement.targetConcepts[1];
    if (causeTarget && !relationSubjectOverlaps(relation.subject, causeTarget)) {
      return false;
    }
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
    if (requested.length > 0) {
      return semanticTextMatches(
        `${combined} ${normalizeRelationAlias(relation.relation)}`,
        requested
      );
    }
    return targets.some((target) => combined.includes(target));
  });
}

function relationSubjectOverlaps(subject: string, requestedCause: string) {
  const subjectTokens = new Set(toSemanticTokens(subject));
  const requestedTokens = toSemanticTokens(requestedCause);
  if (requestedTokens.length === 0) return true;
  return requestedTokens.some((token) => subjectTokens.has(token));
}

function findCalculationFact(
  requirement: RequestRequirement,
  context: MatchContext
): CapabilityFact | ConsequenceCapability | NumericCapability | undefined {
  const requestedInputs = requirement.requiredInputs ?? [];
  const targets = canonicalTargetIds(requirement, context.request);
  const targetTexts = requirement.targetConcepts.map(normalizedText);

  const candidateDefinitions = context.definitions.filter(
    (definition) => definition.polarity === "POSITIVE"
  );
  const definition = candidateDefinitions.find((candidate) => {
    const combined = normalizedText(
      `${candidate.canonicalConcept.label} ${candidate.canonicalConcept.aliases.join(" ")} ${candidate.definitionText} ${candidate.evidenceSpan.text}`
    );
    return (
      hasRequestedInputs(combined, requestedInputs) &&
      (targets.length === 0 ||
        targetTexts.length === 0 ||
        targetTexts.some((target) => includesTokens(combined, target)))
    );
  });
  if (definition) return definition;

  const consequence = context.consequences.find((candidate) => {
    if (candidate.polarity !== "POSITIVE") return false;
    const combined = normalizedText(`${candidate.cause} ${candidate.effect} ${candidate.evidenceSpan.text}`);
    return hasRequestedInputs(combined, requestedInputs);
  });
  if (consequence) return consequence;

  if (requestedInputs.length > 0) {
    const matchingNumerics = requestedInputs
      .map((input) => findNumericInput(input, context))
      .filter((numeric): numeric is NumericCapability => Boolean(numeric));
    if (matchingNumerics.length === requestedInputs.length) {
      return matchingNumerics[0];
    }
  }

  return undefined;
}

function findExplicitFact(
  requirement: RequestRequirement,
  context: MatchContext
): ExplicitFactCapability | undefined {
  const requested = normalizedText(
    `${requirement.requestedFact ?? ""} ${requirement.targetConcepts.join(" ")}`
  );
  const targetIds = canonicalTargetIds(requirement, context.request);
  return context.explicitFacts.find((candidate) => {
    if (candidate.polarity !== "POSITIVE") return false;
    const combined = normalizedText(
      `${candidate.factKey} ${candidate.factText} ${candidate.canonicalConcept?.label ?? ""} ${candidate.canonicalConcept?.aliases.join(" ") ?? ""}`
    );
    if (
      targetIds.length > 0 &&
      candidate.canonicalConcept &&
      targetIds.includes(candidate.canonicalConcept.id)
    ) {
      return semanticTextMatches(combined, requested);
    }
    return semanticTextMatches(combined, requested);
  });
}

function findFormulaVariableSupport(
  requirement: RequestRequirement,
  context: MatchContext
): CapabilitySupportRef[] {
  const requested = normalizedText(
    `${requirement.requestedFact ?? ""} ${requirement.targetConcepts.join(" ")}`
  );
  if (!/\b(?:variables?|symbols?)\b/.test(requested)) return [];

  const formula = findFormula(requirement, context);
  if (!formula) return [];

  const formulaTerms = formulaVariableTerms(formula);
  const supportingFacts = context.explicitFacts.filter((fact) => {
    if (fact.polarity !== "POSITIVE") return false;
    const factText = normalizedText(`${fact.factKey} ${fact.factText}`);
    return formulaTerms.some((term) => factText.includes(term));
  });
  const supportingDefinitions = context.definitions.filter((definition) => {
    if (definition.polarity !== "POSITIVE") return false;
    const definitionText = normalizedText(
      `${definition.canonicalConcept.label} ${definition.definitionText} ${definition.evidenceSpan.text}`
    );
    return formulaTerms.some((term) => definitionText.includes(term));
  });
  const supportingSymbols = context.symbols.filter((symbol) => {
    if (symbol.polarity !== "POSITIVE") return false;
    if (
      requirement.formulaContext &&
      !findPositiveSymbolDefinitionInFormulaContext(
        symbol.symbol.normalized,
        formula,
        context
      )
    ) {
      return false;
    }
    const symbolText = normalizedText(
      `${symbol.symbol.display} ${symbol.symbol.normalized} ${symbol.meaning ?? ""} ${symbol.evidenceSpan.text}`
    );
    return formulaTerms.some(
      (term) =>
        symbol.symbol.normalized === normalizeSymbol(term)?.normalized ||
        symbolText.includes(term)
    );
  });

  return uniqueSupportRefs([
    supportRef(requirement.id, formula.id, ["FORMULA"]),
    ...supportingDefinitions.map((definition) =>
      supportRef(requirement.id, definition.id, ["DEFINE"])
    ),
    ...supportingSymbols.map((symbol) =>
      supportRef(requirement.id, symbol.id, ["SYMBOL"])
    ),
    ...supportingFacts.map((fact) => supportRef(requirement.id, fact.id, ["DEFINE"])),
  ]);
}

function findUnitFactSupport(
  requirement: RequestRequirement,
  context: MatchContext
): CapabilitySupportRef[] {
  const requested = normalizedText(
    `${requirement.requestedFact ?? ""} ${requirement.targetConcepts.join(" ")}`
  );
  if (!/\b(unit|units|measured|measure)\b/.test(requested)) return [];

  const targetIds = canonicalTargetIds(requirement, context.request);
  const targetTexts = uniqueStrings(
    [
      ...requirement.targetConcepts,
      requirement.baseConcept?.aliases?.join(" "),
      requirement.baseConcept?.baseConcept?.replace(/-/g, " "),
    ].filter((value): value is string => Boolean(value))
  ).map(normalizedText);
  const semanticSupports = context.semanticComponents
    .filter((component) => {
      if (component.kind !== "UNIT" || !component.sourceCapabilityId) return false;
      if (targetIds.length === 0) return true;
      if (component.concept && targetIds.includes(component.concept.baseConcept)) return true;
      return semanticTextMatches(component.text ?? "", requested);
    })
    .map((component) => component.sourceCapabilityId)
    .filter((id): id is string => Boolean(id));

  const definitionSupports = context.definitions
    .filter((candidate) => {
      if (candidate.polarity !== "POSITIVE") return false;
      const combined = normalizedText(
        `${candidate.canonicalConcept.label} ${candidate.canonicalConcept.aliases.join(" ")} ${candidate.definitionText} ${candidate.evidenceSpan.text}`
      );
      return (
        /\b(measured|unit|units|volts?|amperes?|amps?|ohms?|newtons?|metres?|meters?|seconds?|grams?|kilograms?)\b/.test(
          combined
        ) &&
        (targetIds.length === 0 ||
          targetIds.includes(candidate.canonicalConcept.id) ||
          targetTexts.some((target) => target.length > 0 && includesTokens(combined, target)) ||
          semanticTextMatches(combined, requested))
      );
    })
    .map((candidate) => candidate.id);

  return uniqueSupportRefs(
    uniqueStrings([...semanticSupports, ...definitionSupports]).map((id) =>
      supportRef(requirement.id, id, ["DEFINE"])
    )
  );
}

function findExplanationContextSupport(
  requirement: RequestRequirement,
  context: MatchContext
): CapabilitySupportRef[] {
  const requested = normalizedText(
    `${requirement.requestedFact ?? ""} ${requirement.targetConcepts.join(" ")}`
  );
  if (
    !/\b(?:supporting\s+context|explanation\s+context|reasoning|working)\b/.test(
      requested
    ) &&
    !(requirement.constraints ?? []).includes("explanation context")
  ) {
    return [];
  }

  const requestedTokens = toSemanticTokens(requested).filter(
    (token) =>
      ![
        "answer",
        "context",
        "explanation",
        "reasoning",
        "supporting",
        "the",
      ].includes(token)
  );
  const hasRequestedToken = (value: string) => {
    const text = normalizedText(value);
    return requestedTokens.length === 0 || requestedTokens.some((token) => text.includes(token));
  };
  const hasContextShape = (value: string) =>
    /\b(?:if|given|when|because|there are|there is|from|using|then|so)\b/i.test(value) ||
    [...value.matchAll(/\b\d+(?:\.\d+)?\b/g)].length >= 2;

  const definitionSupports = context.definitions
    .filter(
      (definition) =>
        definition.polarity === "POSITIVE" &&
        hasRequestedToken(definition.evidenceSpan.text) &&
        hasContextShape(definition.evidenceSpan.text)
    )
    .map((definition) => supportRef(requirement.id, definition.id, ["DEFINE", "PROCESS"]));

  const factSupports = context.explicitFacts
    .filter(
      (fact) =>
        fact.polarity === "POSITIVE" &&
        hasRequestedToken(`${fact.factKey} ${fact.factText}`) &&
        hasContextShape(fact.evidenceSpan.text)
    )
    .map((fact) => supportRef(requirement.id, fact.id, ["DEFINE", "PROCESS"]));

  return uniqueSupportRefs([...definitionSupports, ...factSupports]);
}

function findDefinitionFact(
  requirement: RequestRequirement,
  context: MatchContext
): CapabilityFact | undefined {
  const requested = normalizedText(
    `${requirement.requestedFact ?? ""} ${requirement.targetConcepts.join(" ")}`
  );
  if (!/\b(unit|units|measured|measure)\b/.test(requested)) return undefined;

  return context.definitions.find((candidate) => {
    if (candidate.polarity !== "POSITIVE") return false;
    const combined = normalizedText(
      `${candidate.canonicalConcept.label} ${candidate.canonicalConcept.aliases.join(" ")} ${candidate.definitionText} ${candidate.evidenceSpan.text}`
    );
    return /\b(measured|unit|units|volts?|amperes?|ohms?|metres?|meters?|seconds?|grams?|kilograms?)\b/.test(
      combined
    );
  });
}

function findMethod(
  requirement: RequestRequirement,
  context: MatchContext
): MethodCapability | undefined {
  const requestedRaw = `${requirement.requestedMethod ?? ""} ${requirement.targetConcepts.join(" ")}`;
  const requested = normalizedText(requestedRaw);
  const targets = canonicalTargetIds(requirement, context.request);
  return context.methods.find((candidate) => {
    const combinedRaw = `${candidate.method} ${candidate.stepsText} ${candidate.evidenceSpan.text} ${candidate.canonicalConcept?.label ?? ""}`;
    const combined = normalizedText(combinedRaw);
    if (mathExpressionMatches(combinedRaw, requestedRaw)) return true;
    if (
      candidate.canonicalConcept &&
      targets.length > 0 &&
      targets.includes(candidate.canonicalConcept.id)
    ) {
      return true;
    }
    return semanticTextMatches(combined, requested);
  });
}

function findWorkedExampleSupport(
  requirement: RequestRequirement,
  context: MatchContext
): CapabilitySupportRef[] {
  const requested = normalizedText(
    `${requirement.requestedMethod ?? ""} ${requirement.targetConcepts.join(" ")}`
  );
  if (
    !/\b(?:worked|example|answer|step)\b/.test(requested) &&
    !(requirement.constraints ?? []).includes("worked example")
  ) {
    return [];
  }

  const requestedTokens = toSemanticTokens(requested);
  const scoreText = (value: string) => {
    const haystack = new Set(toSemanticTokens(value));
    return requestedTokens.filter((token) => haystack.has(token)).length;
  };

  const supportIds = new Set<string>();
  for (const method of context.methods) {
    if (scoreText(`${method.method} ${method.stepsText} ${method.evidenceSpan.text}`) > 0) {
      supportIds.add(method.id);
    }
  }
  for (const definition of context.definitions) {
    const text = `${definition.canonicalConcept.label} ${definition.definitionText} ${definition.evidenceSpan.text}`;
    if (
      definition.polarity === "POSITIVE" &&
      (scoreText(text) > 0 || /\b(?:worked|example|calculate|found|gives?)\b/i.test(text))
    ) {
      supportIds.add(definition.id);
    }
  }
  for (const fact of context.explicitFacts) {
    if (fact.polarity === "POSITIVE" && scoreText(`${fact.factKey} ${fact.factText}`) > 0) {
      supportIds.add(fact.id);
    }
  }
  for (const formula of context.formulas) {
    const text = `${formula.canonicalConcept?.label ?? ""} ${formula.expression} ${formula.evidenceSpan.text}`;
    if (scoreText(text) > 0 || requestedTokens.some((token) => text.toLowerCase().includes(token))) {
      supportIds.add(formula.id);
    }
  }
  for (const numeric of context.numerics) {
    const text = `${numeric.quantity} ${numeric.qualifier ?? ""} ${numeric.unit ?? ""} ${numeric.evidenceSpan.text}`;
    if (scoreText(text) > 0 || /\b(?:example|discount|ratio|answer|part|price|girls?|boys?)\b/i.test(text)) {
      supportIds.add(numeric.id);
    }
  }
  for (const consequence of context.consequences) {
    if (
      consequence.polarity === "POSITIVE" &&
      scoreText(`${consequence.cause} ${consequence.effect} ${consequence.evidenceSpan.text}`) > 0
    ) {
      supportIds.add(consequence.id);
    }
  }

  const candidateIds = [...supportIds];
  const hasCalculationShape =
    context.numerics.length >= 2 ||
    candidateIds.some((id) => id.includes(":formula-")) ||
    candidateIds.some((id) => id.includes(":method-")) ||
    candidateIds.some((id) => id.includes(":fact-"));
  if (!hasCalculationShape || candidateIds.length === 0) return [];

  return candidateIds.map((id) =>
    supportRef(requirement.id, id, ["CALCULATE", "PROCESS"])
  );
}

function findEventFact(
  requirement: RequestRequirement,
  context: MatchContext
): EventCapability | undefined {
  const requested = normalizedText(
    `${requirement.requestedEvent ?? ""} ${requirement.requestedFact ?? ""} ${requirement.targetConcepts.join(" ")}`
  );
  const targets = canonicalTargetIds(requirement, context.request);
  return context.eventFacts.find((candidate) => {
    if (candidate.polarity !== "POSITIVE") return false;
    const combined = normalizedText(
      `${candidate.event} ${candidate.outcomeText} ${candidate.numericValues.join(" ")} ${candidate.evidenceSpan.text}`
    );
    const conceptSupported =
      targets.length === 0 ||
      (candidate.canonicalConcept && targets.includes(candidate.canonicalConcept.id));
    return conceptSupported && semanticTextMatches(combined, requested);
  });
}

function findBoundedProbabilityCalculationSupport(
  requirement: RequestRequirement,
  context: MatchContext
): CapabilitySupportRef[] {
  if (!isBoundedProbabilityRequirement(requirement)) return [];

  const formula = context.formulas.find((candidate) => {
    const expression = normalizedText(
      `${candidate.canonicalConcept?.label ?? ""} ${candidate.outputQuantity ?? ""} ${candidate.expression} ${candidate.evidenceSpan.text}`
    );
    return (
      /\b(?:probability|chance|likelihood)\b/.test(expression) &&
      /\bfavou?rable\s+outcomes?\b/.test(expression) &&
      /\btotal\b.{0,30}\boutcomes?\b|\bpossible\s+outcomes?\b/.test(expression) &&
      /\/|\bdivided\s+by\b|\bover\b/.test(expression)
    );
  }) ?? findFormula(requirement, context);

  const event = findEventFact(requirement, context);
  if (!formula || !event || !hasBoundedProbabilityCountAndTotal(event)) {
    return [];
  }

  return uniqueSupportRefs([
    supportRef(requirement.id, formula.id, ["CALCULATE", "FORMULA"]),
    supportRef(requirement.id, event.id, ["CALCULATE"]),
  ]);
}

function isBoundedProbabilityRequirement(requirement: RequestRequirement): boolean {
  const targets = uniqueStrings([
    requirement.baseConcept?.baseConcept ?? "",
    ...requirement.targetConcepts.map(normalizedText),
  ].filter(Boolean));
  return (
    requirement.kind === "CALCULATION" &&
    targets.includes("probability") &&
    (requirement.constraints ?? []).includes("bounded probability")
  );
}

function hasBoundedProbabilityCountAndTotal(event: EventCapability): boolean {
  const text = `${event.outcomeText} ${event.numericValues.join(" ")} ${event.evidenceSpan.text}`;
  const match = text.match(/\b[-+]?\d+(?:\.\d+)?\s+out\s+of\s+[-+]?\d+(?:\.\d+)?\b/i);
  return Boolean(match);
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
    [
      requirement.baseConcept?.baseConcept,
      ...requirement.targetConcepts.map((target) => canonicalizeConcept(target, request).id),
    ].filter((target): target is string => Boolean(target))
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

function uniqueSupportRefs(refs: CapabilitySupportRef[]): CapabilitySupportRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.requirementId}:${ref.capabilityId}:${ref.allowedUses.join(",")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const hasDirectiveMetadata = request.requirements.some(
    (requirement) => (requirement.ignoredDirectiveText ?? []).length > 0
  );
  if (!request.safetyIntent.asksToIgnoreSources && !hasDirectiveMetadata) return false;
  return !request.requirements.some(hasEducationalRequirementSignal);
}

function hasEducationalRequirementSignal(requirement: RequestRequirement): boolean {
  return (
    requirement.targetConcepts.length > 0 ||
    Boolean(requirement.baseConcept?.baseConcept) ||
    Boolean(requirement.requiredSemanticComponents?.length) ||
    Boolean(requirement.requiredSymbols?.length) ||
    Boolean(requirement.requiredInputs?.length) ||
    Boolean(requirement.comparisonSides?.length) ||
    Boolean(requirement.requestedProcess) ||
    Boolean(requirement.requestedFact) ||
    Boolean(requirement.requestedEvent) ||
    Boolean(requirement.requestedMethod) ||
    Boolean(requirement.passageTask) ||
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

function semanticTextMatches(haystack: string, needle: string): boolean {
  const haystackTokens = new Set(toSemanticTokens(haystack));
  const needleTokens = toSemanticTokens(needle);
  if (needleTokens.length === 0) return false;
  const matched = needleTokens.filter((token) => haystackTokens.has(token));
  if (needleTokens.length <= 2) return matched.length === needleTokens.length;
  return matched.length >= Math.max(2, Math.ceil(needleTokens.length * 0.65));
}

function mathExpressionMatches(haystack: string, needle: string): boolean {
  if (!/[=+\-*/]/.test(needle)) return false;
  const requestedTokens = needle
    .split(" ")
    .filter((token) => /^[a-z]$|\d+/.test(token));
  if (requestedTokens.length === 0) return false;
  const haystackTokens = new Set(
    haystack.split(" ").filter((token) => /^[a-z]$|\d+/.test(token))
  );
  return requestedTokens.every((token) => haystackTokens.has(token));
}

function toSemanticTokens(value: string): string[] {
  const synonymized = normalizedText(value)
    .replace(/\baffects?\b/g, " affect ")
    .replace(/\bchanges?\b/g, " affect ")
    .replace(/\bturns?\b/g, " affect ")
    .replace(/\broll(?:ing)?\b/g, " roll ")
    .replace(/\bgetting\b/g, " get ")
    .replace(/\bchance\b/g, " probability ")
    .replace(/\blikelihood\b/g, " probability ")
    .replace(/\bmainly\b/g, " main ")
    .replace(/\bsummar(?:y|ise|ize|ises|izes)\b/g, " summary ");
  return uniqueStrings(
    synonymized
      .split(" ")
      .map((token) => singularizeToken(token))
      .filter((token) => token.length > 2 && !SEMANTIC_STOPWORDS.has(token))
  );
}

function normalizeRelationAlias(relation: string): string {
  if (/^(?:turn|turns|change|changes|affect|affects)$/.test(relation)) {
    return "affect";
  }
  if (/^(?:carry|carries|transport|transports)$/.test(relation)) {
    return "transport";
  }
  return relation;
}

function singularizeToken(token: string): string {
  if (/^(?:physics|mathematics|series)$/.test(token)) return token;
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

const SEMANTIC_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "from",
  "with",
  "when",
  "what",
  "which",
  "how",
  "why",
  "does",
  "have",
  "this",
  "that",
  "into",
  "using",
  "used",
  "simple",
  "term",
  "terms",
  "question",
  "mathematics",
  "physics",
  "chemistry",
  "biology",
  "english",
]);

function hasRequestedInputs(text: string, requestedInputs: string[]): boolean {
  if (requestedInputs.length === 0) return true;
  return requestedInputs.every((input) => {
    const parsed = parseInputValue(input);
    if (!parsed) return false;
    const valuePattern = new RegExp(`\\b${escapeRegExp(String(parsed.value))}(?:\\.0+)?\\b`);
    if (!valuePattern.test(text)) return false;
    return !parsed.unit || text.includes(parsed.unit);
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizedText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9%/²³₦£$]+/g, " ").replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
