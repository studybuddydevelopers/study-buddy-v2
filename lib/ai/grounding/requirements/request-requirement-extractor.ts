import type {
  ExtractRequestRequirementsInput,
  RequestContextMessage,
  RequestRequirement,
  RequestRequirements,
  RequestSafetyIntent,
  RequirementKind,
  PresentationStyle,
} from "./types";
import {
  canonicalizeSemanticConcept,
  inferRequestedFacet,
  makeSemanticComponent,
  normalizeSemanticBaseConcept,
  type SemanticComponent,
  type SemanticFacet,
} from "../semantic-concepts";

const DEFAULT_CONTEXT_LIMIT = 6;
const SYMBOL_NAMES = new Set([
  "lambda",
  "rho",
  "theta",
  "alpha",
  "beta",
  "gamma",
  "pi",
  "delta",
]);

type RequirementDraft = {
  kind: RequirementKind;
  targetConcepts: string[];
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
  childRequirements?: RequirementDraft[];
};

type RequirementBuildContext = {
  subjectId: string;
  topicId?: string;
  contextConcept?: string;
  contextProcess?: string;
  dependsOnPreviousTurn: boolean;
  ignoredDirectiveText?: string[];
  requestedAction?: string;
  presentationStyle?: PresentationStyle;
};

export function extractRequestRequirements(
  input: ExtractRequestRequirementsInput
): RequestRequirements {
  const normalizedQuestion = normalizeQuestion(input.question);
  const quotedSegments = extractQuotedSegments(normalizedQuestion);
  const explicitQuotedTask = extractExplicitQuotedTask(normalizedQuestion, quotedSegments);
  const activeQuestion =
    explicitQuotedTask ?? removeNonTaskHostileQuotes(normalizedQuestion, quotedSegments);
  const directiveMetadata = extractDirectiveMetadata(activeQuestion);
  const educationalQuestion = directiveMetadata.educationalQuestion;
  const context = resolveRecentContext(
    input.recentMessages ?? [],
    input.maxContextMessages ?? DEFAULT_CONTEXT_LIMIT
  );
  const currentHasExplicitConcept = hasExplicitCurrentConcept(educationalQuestion);
  const namedPossessiveFacet = hasNamedPossessiveFacetTarget(educationalQuestion);
  const shouldUseContext =
    !namedPossessiveFacet &&
    isContextualFollowUp(activeQuestion) &&
    (!currentHasExplicitConcept || isPronounOnlyFollowUp(activeQuestion)) &&
    Boolean(context.concept || context.process);
  const drafts = buildRequirementDrafts(educationalQuestion, {
    subjectId: input.subjectId,
    topicId: input.topicId,
    contextConcept: shouldUseContext ? context.concept : undefined,
    contextProcess: shouldUseContext ? context.process : undefined,
    dependsOnPreviousTurn: shouldUseContext,
    ignoredDirectiveText: directiveMetadata.ignoredDirectiveText,
  });

  return {
    requestId:
      input.requestId ??
      `request-${stableHash(`${input.subjectId}:${input.topicId ?? ""}:${normalizedQuestion}`)}`,
    normalizedQuestion,
    subjectId: input.subjectId,
    topicId: input.topicId,
    requirements: assignRequirementIds(drafts, input.subjectId, input.topicId),
    safetyIntent: buildSafetyIntent(activeQuestion, quotedSegments),
  };
}

export function normalizeQuestion(question: string): string {
  return question
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function buildRequirementDrafts(
  question: string,
  context: RequirementBuildContext
): RequirementDraft[] {
  const normalizedContext = {
    ...context,
    requestedAction: detectRequestedAction(question),
    presentationStyle: detectPresentationStyle(question),
  };

  const methodSelection = buildMethodSelectionRequirement(question);
  if (methodSelection) return [withContext(methodSelection, normalizedContext)];

  const multiOption = buildMultiOptionRequirement(question);
  if (multiOption) return [withContext(multiOption, normalizedContext)];

  const formulaPlusUnits = buildFormulaAndUnitRequirement(question, context);
  if (formulaPlusUnits) return [withContext(formulaPlusUnits, normalizedContext)];

  const formulaVariables = buildFormulaVariableRequirement(question, context);
  if (formulaVariables) return [withContext(formulaVariables, normalizedContext)];

  const workedExample = buildWorkedExampleRequirement(question);
  if (workedExample) return [withContext(workedExample, normalizedContext)];

  const referencedAnswer = buildReferencedAnswerRequirement(question);
  if (referencedAnswer) return [withContext(referencedAnswer, normalizedContext)];

  const ratio = buildRatioRequirement(question);
  if (ratio) return [withContext(ratio, normalizedContext)];

  const passageInterpretation = buildPassageInterpretationRequirement(question);
  if (passageInterpretation) return [withContext(passageInterpretation, normalizedContext)];

  const procedure = buildProcedureMethodRequirement(question, context);
  if (procedure) return [withContext(procedure, normalizedContext)];

  const boundedProbability = buildBoundedProbabilityCalculationRequirement(question);
  if (boundedProbability) return [withContext(boundedProbability, normalizedContext)];

  const factLookup = buildFactLookupRequirement(question);
  if (factLookup) return [withContext(factLookup, normalizedContext)];

  const formulaRelation = buildFormulaRelationRequirement(question);
  if (formulaRelation) return [withContext(formulaRelation, normalizedContext)];

  const facetRequirement = buildFacetRequirement(question, context);
  if (facetRequirement) return [withContext(facetRequirement, normalizedContext)];

  const calculation = buildCalculationRequirement(question);
  if (calculation) return [withContext(calculation, normalizedContext)];

  const comparison = buildComparisonRequirement(question);
  if (comparison) return [withContext(comparison, normalizedContext)];

  const formulaWithSymbols = buildFormulaWithSymbolsRequirement(question, context);
  if (formulaWithSymbols) return [withContext(formulaWithSymbols, normalizedContext)];

  const symbolDefinition = buildSymbolDefinitionRequirement(question);
  if (symbolDefinition) return [withContext(symbolDefinition, normalizedContext)];

  const formula = buildFormulaRequirement(question, context);
  if (formula) return [withContext(formula, normalizedContext)];

  const formulaConcept = buildFormulaConceptRequirement(question, context);
  if (formulaConcept) return [withContext(formulaConcept, normalizedContext)];

  const multiPart = buildMultiPartRequirement(question, context);
  if (multiPart) return [withContext(multiPart, normalizedContext)];

  const relation = buildRelationRequirement(question);
  if (relation) return [withContext(relation, normalizedContext)];

  const process = buildProcessRequirement(question, context);
  if (process) return [withContext(process, normalizedContext)];

  const definition = buildDefinitionRequirement(question, context);
  if (definition) return [withContext(definition, normalizedContext)];

  return [
    withContext(
      {
        kind: context.dependsOnPreviousTurn
          ? "CONTEXTUAL_FOLLOW_UP"
          : "CONCEPT_DEFINITION",
        targetConcepts: compactStrings([context.contextConcept]),
        requestedRelation: cleanConcept(question),
      },
      normalizedContext
    ),
  ];
}

function buildRatioRequirement(question: string): RequirementDraft | undefined {
  if (/\bsimplif(?:y|ying|ies|ied)\b/i.test(question) && /\bratios?\b/i.test(question)) {
    const ratioValue = extractRatioValue(question);
    return {
      kind: "CONCEPT_DEFINITION",
      targetConcepts: ratioValue ? ["ratio"] : ["simplifying a ratio"],
    };
  }

  if (!/\b(compare|comparison|compares|amounts?|quantit(?:y|ies)|parts?)\b/i.test(question)) {
    return undefined;
  }
  if (!/\b\d+\s*(?::|to)\s*\d+\b/i.test(question)) return undefined;
  const ratioValue = extractRatioValue(question);

  return {
    kind: "CONCEPT_DEFINITION",
    targetConcepts: compactStrings(["ratio", ratioValue ? `ratio ${ratioValue}` : ""]),
  };
}

function buildMethodSelectionRequirement(question: string): RequirementDraft | undefined {
  const match =
    question.match(/\bwhen\s+(?:should|would|do)\s+(?:i\s+)?use\s+(.+?)\s+(?:instead\s+of|rather\s+than)\s+(.+?)(?:[?.]|$)/i) ??
    question.match(/\bwhen\s+would\s+(.+?)\s+be\s+better\s+than\s+(.+?)(?:[?.]|$)/i);
  if (!match) return undefined;

  const sides = normalizeComparisonSides([
    cleanConcept(match[1] ?? ""),
    cleanConcept(match[2] ?? ""),
  ]);
  if (sides.length < 2) return undefined;

  return {
    kind: "COMPARISON",
    targetConcepts: sides,
    comparisonSides: sides,
    requestedAction: "SELECT_METHOD",
    constraints: ["method selection"],
    requestedRelation: `${sides[0]} instead of ${sides[1]}`,
  };
}

function buildMultiOptionRequirement(question: string): RequirementDraft | undefined {
  if (!/\b(which|choose|select|best|cheapest|cheaper|lowest|highest)\b/i.test(question)) {
    return undefined;
  }

  const asksForUnitRate = /\b(?:cheaper|cheapest|lower|lowest|less|best)\b.{0,40}\bper\s+[A-Za-z]+\b/i.test(
    question
  );
  if (
    !asksForUnitRate &&
    !/\b(two|three|four|options?|packs?|crates?|plans?|shops?|choices?|alternatives?)\b/i.test(question)
  ) {
    return undefined;
  }

  const relation =
    firstMatch(question, /\b((?:cheaper|cheapest|lower|lowest|less|best)\s+per\s+[A-Za-z]+)\b/i) ??
    firstMatch(question, /\b(cheaper per item|cheapest|best|lowest|highest|greater|smaller)\b/i);

  return {
    kind: "MULTI_OPTION_COMPARISON",
    targetConcepts: compactStrings([relation ?? "options"]),
    comparisonSides: inferOptionSides(question),
    requestedRelation: relation ?? cleanConcept(question),
  };
}

function buildFormulaAndUnitRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  if (!/\b(?:units?|measured\s+in)\b/i.test(question)) return undefined;

  const formulaish =
    /\bformula\b/i.test(question) ||
    /\blaw\b/i.test(question) ||
    /\b[A-Za-z]\s*=\s*[A-Za-z0-9]/.test(question) ||
    /\bone\s+formula\b/i.test(question);
  const concept = inferFormulaUnitTarget(question, context);
  if (!concept) return undefined;

  const unitTarget = inferUnitFactTarget(question, concept);
  const unitChild: RequirementDraft = {
    kind: "FACT_LOOKUP",
    targetConcepts: compactStrings([unitTarget]),
    requestedFact: `${unitTarget} units used`,
    requestedFacet: "UNIT",
    requestedAction: "STATE_UNIT",
  };

  if (formulaish) {
    return {
      kind: "MULTI_PART",
      targetConcepts: compactStrings([concept, unitTarget]),
      requestedAction: detectRequestedAction(question) ?? "EXPLAIN",
      presentationStyle: detectPresentationStyle(question),
      childRequirements: [
        {
          kind: "FORMULA",
          targetConcepts: compactStrings([concept, context.contextConcept]),
          requestedAction: "STATE_FORMULA",
        },
        unitChild,
      ],
    };
  }

  return {
    kind: "MULTI_PART",
    targetConcepts: compactStrings([concept, unitTarget]),
    requestedAction: detectRequestedAction(question) ?? "TEACH",
    presentationStyle: detectPresentationStyle(question),
    childRequirements: [
      {
        kind: "CONCEPT_DEFINITION",
        targetConcepts: compactStrings([concept, context.contextConcept]),
        requestedFacet: "DEFINITION",
        requestedAction: "DEFINE",
      },
      unitChild,
    ],
  };
}

function buildFormulaVariableRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  if (!/\bformula\b/i.test(question)) return undefined;
  if (
    !/\b(?:define|explain|name|identify|state)\b.{0,80}\b(?:variables?|symbols?)\b/i.test(
      question
    )
  ) {
    return undefined;
  }

  const concept = extractFormulaConcept(question);
  if (!concept && !context.contextConcept) return undefined;

  return {
    kind: "MULTI_PART",
    targetConcepts: compactStrings([concept, context.contextConcept]),
    requestedAction: detectRequestedAction(question) ?? "TEACH",
    presentationStyle: detectPresentationStyle(question),
    childRequirements: [
      {
        kind: "FORMULA",
        targetConcepts: compactStrings([concept, context.contextConcept]),
        requestedAction: "STATE_FORMULA",
      },
      {
        kind: "FACT_LOOKUP",
        targetConcepts: compactStrings([concept, context.contextConcept]),
        requestedFact: `${concept || context.contextConcept || "formula"} variables`,
        requestedFacet: "DEFINITION",
        requestedAction: "DEFINE_VARIABLES",
      },
    ],
  };
}

function buildWorkedExampleRequirement(question: string): RequirementDraft | undefined {
  const target =
    firstMatch(question, /\b(?:work\s+through|walk\s+(?:me\s+)?through|go\s+through)\s+(?:the\s+|this\s+)?(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\b(?:show\s+me|show|explain)\s+(?:the\s+|this\s+)?(.+?)\s+step\s+by\s+step(?:[?.]|$)/i) ??
    firstMatch(question, /\b(?:teach|explain|show\s+me)\s+(?:me\s+)?(?:the\s+|this\s+)?(.+?\bexample)(?:[?.]|$)/i);
  if (!target) return undefined;

  const cleaned = cleanWorkedExampleTarget(target);
  if (!cleaned) return undefined;

  return {
    kind: "PROCEDURE_METHOD",
    targetConcepts: [cleaned],
    requestedMethod: `worked example ${cleaned}`,
    requestedAction: "WORK_THROUGH",
    presentationStyle: "STEP_BY_STEP",
    constraints: ["worked example"],
  };
}

function buildReferencedAnswerRequirement(question: string): RequirementDraft | undefined {
  const referenced = question.match(
    /\bfor\s+(.+?\bquestion\s+\d+[A-Za-z]?)\s*,?\s*(?:please\s+)?(?:explain|work\s+through|walk\s+(?:me\s+)?through|show\s+me)\s+(?:the\s+)?(.+?)(?:[?.]|$)/i
  );
  if (!referenced) return undefined;

  const reference = cleanConcept(referenced[1] ?? "");
  const answerTarget = cleanConcept(referenced[2] ?? "");
  if (!reference || !answerTarget) return undefined;

  const questionNumber = firstMatch(reference, /\b(question\s+\d+[A-Za-z]?)\b/i) ?? reference;

  return {
    kind: "MULTI_PART",
    targetConcepts: compactStrings([reference, answerTarget]),
    requestedAction: "EXPLAIN",
    childRequirements: [
      {
        kind: "FACT_LOOKUP",
        targetConcepts: ["identifier"],
        requestedFact: questionNumber,
        requestedFacet: "DEFINITION",
      },
      {
        kind: "FACT_LOOKUP",
        targetConcepts: compactStrings([answerTarget]),
        requestedFact: answerTarget,
        requestedFacet: "DEFINITION",
      },
      {
        kind: "FACT_LOOKUP",
        targetConcepts: compactStrings([`${answerTarget} supporting context`]),
        requestedFact: `${answerTarget} supporting context`,
        requestedAction: "EXPLAIN_CONTEXT",
        requestedFacet: "DEFINITION",
        constraints: ["explanation context"],
      },
      {
        kind: "FACT_LOOKUP",
        targetConcepts: ["answer"],
        requestedFact: "answer",
        requestedFacet: "DEFINITION",
      },
    ],
  };
}

function buildCalculationRequirement(question: string): RequirementDraft | undefined {
  if (
    !/\b(calculate|work out|compute|determine|find|show how|explain how)\b/i.test(
      question
    )
  ) {
    return undefined;
  }

  const target =
    firstMatch(
      question,
      /\b(?:calculate|work out|compute|determine|find)\s+(?:the\s+)?(.+?)(?:\s+(?:from|when|if|given|using|where|with)\b|[?.]|$)/i
    ) ??
    firstMatch(
      question,
      /\b(?:show how|explain how).+?\b(?:gives?|finds?|produces?)\s+(?:the\s+)?(.+?)(?:[?.]|$)/i
    ) ??
    firstMatch(
      question,
      /\b(?:sale price|new value|discount amount|percentage increase|percentage decrease|percentage of)\b/i
    ) ??
    "";

  return {
    kind: "CALCULATION",
    targetConcepts: compactStrings([cleanCalculationTarget(target)]),
    requiredInputs: extractNumericInputs(question),
    requiredInputConcepts: extractNamedCalculationInputs(question),
  };
}

function buildBoundedProbabilityCalculationRequirement(
  question: string
): RequirementDraft | undefined {
  if (!/\b(?:probability|chance|likelihood)\b/i.test(question)) return undefined;
  if (requiresUnboundedProbabilityReasoning(question)) return undefined;

  const probabilityEvent =
    firstMatch(question, /\b(?:what\s+is\s+)?(?:the\s+)?(?:probability|chance|likelihood)\s+of\s+(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\b(?:probability|chance|likelihood)\s+for\s+(.+?)(?:[?.]|$)/i);
  if (!probabilityEvent) return undefined;

  const event = normalizeEventPhrase(probabilityEvent);
  if (!event) return undefined;

  return {
    kind: "CALCULATION",
    targetConcepts: ["probability"],
    requestedAction: "CALCULATE",
    requestedFact: compactStrings(["probability", event]).join(" "),
    requestedEvent: event,
    requiredInputConcepts: ["favourable outcomes", "total outcomes"],
    constraints: [
      "bounded probability",
      "favourable outcomes divided by total outcomes",
    ],
  };
}

function requiresUnboundedProbabilityReasoning(question: string): boolean {
  return /\b(?:conditional|given\s+that|without\s+replacement|with\s+replacement|permutation|combination|arrangements?|bayes|probability\s+tree|dependent\s+events?|independent\s+events?|at\s+least|exactly|more\s+than|less\s+than|not\s+rolling|two\s+dice|three\s+dice|cards?\s+(?:drawn|selected|chosen)|infer|work\s+out\s+which\s+outcomes?|list\s+(?:the\s+)?(?:outcomes?|favourable\s+outcomes?))\b/i.test(
    question
  );
}

function buildFactLookupRequirement(question: string): RequirementDraft | undefined {
  const probabilityEvent =
    firstMatch(question, /\b(?:what\s+is\s+)?(?:the\s+)?(?:probability|chance|likelihood)\s+of\s+(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\b(?:probability|chance|likelihood)\s+for\s+(.+?)(?:[?.]|$)/i);
  if (probabilityEvent) {
    const event = normalizeEventPhrase(probabilityEvent);
    return {
      kind: "FACT_LOOKUP",
      targetConcepts: ["probability"],
      requestedFact: compactStrings(["probability", event]).join(" "),
      requestedEvent: event,
    };
  }

  const countTarget = firstMatch(question, /\bhow\s+many\s+(.+?)(?:[?.]|$)/i);
  if (countTarget) {
    const fact = cleanConcept(countTarget);
    return {
      kind: "FACT_LOOKUP",
      targetConcepts: compactStrings([fact]),
      requestedFact: compactStrings(["how many", fact]).join(" "),
    };
  }

  if (
    /\b(?:what|which)\s+(?:is\s+)?(?:the\s+)?(?:question\s+number|identifier|reference)(?:\s+(?:is\s+)?(?:this|it|from))?(?:[?.]|$)/i.test(
      question
    ) ||
    /\b(?:which|what)\s+question\s+(?:is\s+)?(?:this|it)\s+from(?:[?.]|$)/i.test(
      question
    )
  ) {
    return {
      kind: "FACT_LOOKUP",
      targetConcepts: ["identifier"],
      requestedFact: "question identifier",
    };
  }

  return undefined;
}

function buildFormulaRelationRequirement(question: string): RequirementDraft | undefined {
  const proveFormula = question.match(
    /\buse\s+(?:the\s+)?(.+?\bformula)\s+to\s+prove\s+(?:the\s+)?(.+?\bformula)\b/i
  );
  if (proveFormula) {
    const source = cleanConcept(proveFormula[1] ?? "");
    const target = cleanConcept(proveFormula[2] ?? "");
    return {
      kind: "RELATION_MECHANISM_CONSEQUENCE",
      targetConcepts: compactStrings([source, target]),
      requestedRelation: compactStrings([source, "prove", target]).join(" "),
      requestedAction: "prove formula relation",
      constraints: ["prove", source],
    };
  }

  const explainUsingFormula = question.match(
    /\bexplain\s+(?:the\s+)?(.+?)\s+using\s+(?:the\s+)?(.+?\bformula)\b/i
  );
  if (explainUsingFormula) {
    const target = cleanConcept(explainUsingFormula[1] ?? "");
    const formula = cleanConcept(explainUsingFormula[2] ?? "");
    return {
      kind: "RELATION_MECHANISM_CONSEQUENCE",
      targetConcepts: compactStrings([target, formula]),
      requestedRelation: compactStrings([formula, "explain", target]).join(" "),
      requestedAction: "explain concept using formula",
      constraints: compactStrings([formula]),
    };
  }

  return undefined;
}

function buildFacetRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  const measured =
    firstMatch(question, /\bwhat\s+(?:is|are)\s+(.+?)\s+measured\s+in(?:[?.]|$)/i) ??
    firstMatch(question, /\b(?:unit|units)\s+of\s+(.+?)(?:[?.]|$)/i);
  if (measured) {
    const target = cleanConcept(measured);
    return {
      kind: "FACT_LOOKUP",
      targetConcepts: compactStrings([target]),
      requestedFact: `${target} unit`,
      requestedFacet: "UNIT",
      requestedAction: "state unit",
    };
  }

  const useful =
    firstMatch(question, /\bwhy\s+(?:is|are)\s+(.+?)\s+useful(?:[?.]|$)/i) ??
    firstMatch(question, /\bwhat\s+is\s+(?:the\s+)?purpose\s+of\s+(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\bwhat\s+is\s+(.+?)\s+used\s+for(?:[?.]|$)/i);
  if (useful) {
    const target = cleanConcept(useful);
    return {
      kind: "RELATION_MECHANISM_CONSEQUENCE",
      targetConcepts: compactStrings([target, context.contextConcept]),
      requestedRelation: `${target} purpose`,
      requestedFacet: "PURPOSE",
      requestedAction: "explain purpose",
    };
  }

  const kindMentioned =
    firstMatch(question, /\bwhat\s+(?:kinds?|types?)\s+of\s+(.+?)\s+are\s+mentioned(?:[?.]|$)/i) ??
    firstMatch(question, /\bwhat\s+(?:is|are)\s+(?:a\s+|an\s+|the\s+)?(.+?),\s+and\s+what\s+(?:kinds?|types?)\s+are\s+mentioned(?:[?.]|$)/i);
  if (kindMentioned) {
    const target = cleanConcept(kindMentioned);
    return {
      kind: "MULTI_PART",
      targetConcepts: compactStrings([target]),
      requestedAction: "DEFINE",
      constraints: ["kinds mentioned"],
      childRequirements: [
        {
          kind: "CONCEPT_DEFINITION",
          targetConcepts: compactStrings([target]),
          requestedFacet: "DEFINITION",
          requestedAction: "DEFINE",
        },
        {
          kind: "FACT_LOOKUP",
          targetConcepts: compactStrings([target]),
          requestedFact: `${target} kinds mentioned`,
          requestedFacet: "DEFINITION",
          requestedAction: "LIST_KINDS",
          constraints: ["kinds mentioned"],
        },
      ],
    };
  }

  const usedAndLimitation = question.match(
    /\bwhen\s+should\s+(.+?)\s+be\s+used,\s+and\s+what\s+can\s+it\s+not\s+do(?:[?.]|$)/i
  );
  if (usedAndLimitation) {
    const target = cleanConcept(usedAndLimitation[1] ?? "");
    return {
      kind: "MULTI_PART",
      targetConcepts: compactStrings([target]),
      requestedAction: "state use and limitation",
      childRequirements: [
        {
          kind: "PROCESS_EXPLANATION",
          targetConcepts: compactStrings([target]),
          requestedProcess: target,
          requestedFacet: "PROCESS",
        },
        {
          kind: "FACT_LOOKUP",
          targetConcepts: compactStrings([target]),
          requestedFact: `${target} limitation`,
          requestedFacet: "LIMITATION",
        },
      ],
    };
  }

  const limitation =
    firstMatch(question, /\bwhat\s+is\s+(?:its|the)\s+limitation(?:[?.]|$)/i) ??
    firstMatch(question, /\bwhat\s+can\s+(.+?)\s+not\s+do(?:[?.]|$)/i);
  if (limitation || /\bwhat\s+can\s+it\s+not\s+do\b/i.test(question)) {
    const target = cleanConcept(limitation ?? context.contextConcept ?? "");
    return {
      kind: "FACT_LOOKUP",
      targetConcepts: compactStrings([target, context.contextConcept]),
      requestedFact: `${target || context.contextConcept || "concept"} limitation`,
      requestedFacet: "LIMITATION",
      requestedAction: "state limitation",
    };
  }

  return undefined;
}

function buildProcedureMethodRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  const methodExplanation = extractMethodExplanationCalculationRequest(question);
  if (methodExplanation && extractNumericInputs(question).length === 0) {
    const target = cleanCalculationTarget(methodExplanation.target);
    return {
      kind: "PROCEDURE_METHOD",
      targetConcepts: compactStrings([target]),
      requestedMethod: cleanMethod(`${methodExplanation.verb} ${methodExplanation.target}`),
      requestedAction: "EXPLAIN",
    };
  }

  const madeTarget =
    firstMatch(question, /\bhow\s+do\s+i\s+(?:get|make|create|form)\s+(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\bhow\s+(?:is|are)\s+(.+?)\s+(?:made|formed|created|produced)(?:[?.]|$)/i) ??
    firstMatch(question, /\bwhat\s+do\s+i\s+do\s+to\s+(?:get|make|create|form)\s+(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\bshow\s+me\s+how\s+to\s+(?:get|make|create|form)\s+(.+?)(?:[?.]|$)/i);
  if (madeTarget) {
    let target = cleanConcept(madeTarget);
    if (context.contextConcept && /\bequivalent\s+forms?\b/i.test(target)) {
      target = `equivalent ${context.contextConcept}`;
    }
    return {
      kind: "PROCEDURE_METHOD",
      targetConcepts: compactStrings([target]),
      requestedMethod: `make ${target}`,
      requestedAction: "EXPLAIN",
    };
  }

  if (!/\b(?:how\s+do\s+i|how\s+can\s+i|how\s+to|what\s+steps?|which\s+steps?|explain\s+how\s+to|show\s+how\s+to)\b/i.test(question)) {
    return undefined;
  }

  const method =
    firstMatch(question, /\b(?:explain\s+how\s+to|show\s+how\s+to|how\s+do\s+i|how\s+can\s+i|how\s+to)\s+(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\b(?:what|which)\s+steps?\s+(?:are\s+used\s+)?(?:to|for)\s+(.+?)(?:[?.]|$)/i);
  const cleanedMethod = cleanMethod(method ?? question);
  const target =
    firstMatch(cleanedMethod, /\b(?:find|solve|balance|separate|filter|prepare|calculate)\s+(.+?)(?:\s+(?:in|from|with|using)\b|$)/i) ??
    cleanedMethod;

  return {
    kind: "PROCEDURE_METHOD",
    targetConcepts: compactStrings([cleanConcept(target)]),
    requestedMethod: cleanedMethod,
  };
}

function extractMethodExplanationCalculationRequest(question: string) {
  const direct = question.match(
    /\bhow\s+(?:do|would|can)\s+(?:you|we|i)\s+(find|calculate|work\s+out|compute|determine)\s+(?:the\s+)?(.+?)(?:[?.]|$)/i
  );
  if (direct) return { verb: direct[1] ?? "calculate", target: direct[2] ?? "" };

  const passive = question.match(
    /\bhow\s+(?:is|are)\s+(?:the\s+)?(.+?)\s+(found|calculated|worked\s+out|computed|determined)(?:[?.]|$)/i
  );
  if (passive) {
    return {
      verb: passiveVerbToActive(passive[2] ?? "calculated"),
      target: passive[1] ?? "",
    };
  }

  const imperative = question.match(
    /\b(?:explain|show)\s+how\s+to\s+(find|calculate|work\s+out|compute|determine)\s+(?:the\s+)?(.+?)(?:[?.]|$)/i
  );
  if (imperative) {
    return { verb: imperative[1] ?? "calculate", target: imperative[2] ?? "" };
  }
  return undefined;
}

function passiveVerbToActive(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "found") return "find";
  if (normalized === "calculated") return "calculate";
  if (normalized === "worked out") return "work out";
  if (normalized === "computed") return "compute";
  if (normalized === "determined") return "determine";
  return "calculate";
}

function buildComparisonRequirement(question: string): RequirementDraft | undefined {
  const compareMatch =
    firstMatch(
      question,
      /\b(?:compare|distinguish|differentiate)\s+(.+?)\s+(?:and|with|from|vs\.?|versus)\s+(.+?)(?:[?.]|$)/i,
      "pair"
    ) ??
    firstMatch(
      question,
      /\b(?:difference|differences)\s+between\s+(.+?)\s+and\s+(.+?)(?:[?.]|$)/i,
      "pair"
    );

  if (!compareMatch) return undefined;

  const sides = normalizeComparisonSides(compareMatch.map(cleanConcept));

  if (sides.length < 2) return undefined;

  return {
    kind: "COMPARISON",
    targetConcepts: sides,
    comparisonSides: sides,
  };
}

function buildFormulaWithSymbolsRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  if (!/\bformula\b/i.test(question)) return undefined;
  if (
    !/\b(define|meaning|means|mean|represent|represents|stands for|explain what|what .* stands for|what .* means)\b/i.test(
      question
    )
  ) {
    return undefined;
  }

  const symbols = extractRequestedSymbols(question);
  if (symbols.length === 0) return undefined;

  return {
    kind: "FORMULA_WITH_SYMBOLS",
    targetConcepts: compactStrings([extractFormulaConcept(question), context.contextConcept]),
    requiredSymbols: symbols,
  };
}

function buildFormulaRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  if (!/\bformula\b/i.test(question)) return undefined;

  return {
    kind: "FORMULA",
    targetConcepts: compactStrings([extractFormulaConcept(question), context.contextConcept]),
  };
}

function buildFormulaConceptRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  const concept =
    firstMatch(
      question,
      /\b(?:teach|explain|state|give|describe)\s+(?:me\s+)?(.+?\blaw)\b/i
    ) ??
    firstMatch(question, /\b(.+?\blaw)\b.+\b(?:units?|symbols?|formula)\b/i);
  if (!concept) return undefined;

  if (/\bunits?\b/i.test(question)) {
    const cleaned = cleanConcept(concept);
    return {
      kind: "MULTI_PART",
      targetConcepts: compactStrings([cleaned, "units"]),
      childRequirements: [
        {
          kind: "FORMULA",
          targetConcepts: compactStrings([cleaned, context.contextConcept]),
        },
        {
          kind: "FACT_LOOKUP",
          targetConcepts: ["units"],
          requestedFact: `${cleaned} units used`,
        },
      ],
    };
  }

  return {
    kind: "FORMULA",
    targetConcepts: compactStrings([cleanConcept(concept), context.contextConcept]),
  };
}

function buildSymbolDefinitionRequirement(question: string): RequirementDraft | undefined {
  const symbol = extractPrimarySymbolRequest(question);
  if (!symbol) return undefined;

  return {
    kind: "SYMBOL_DEFINITION",
    targetConcepts: [],
    requiredSymbols: [symbol],
  };
}

function buildMultiPartRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  if (!/\b(state|list|name|give|mention)\b/i.test(question)) return undefined;
  if (!/\band\b/i.test(question)) return undefined;
  if (/\b(compare|calculate|formula)\b/i.test(question)) return undefined;

  const scopedRule = question.match(
    /\b(?:state|list|name|give|mention)\s+(?:the\s+)?(.+?)\s+and\s+(.+?)\s+(.+?\brules?)\b/i
  );
  if (scopedRule) {
    const first = cleanConcept(scopedRule[1] ?? "");
    const second = cleanConcept(scopedRule[2] ?? "");
    const base = cleanConcept(scopedRule[3] ?? "");
    const firstTarget = compactStrings([first, base]).join(" ");
    const secondTarget = compactStrings([second, base]).join(" ");
    return {
      kind: "MULTI_PART",
      targetConcepts: compactStrings([firstTarget, secondTarget]),
      childRequirements: [firstTarget, secondTarget].map((target) => ({
        kind: "FORMULA",
        targetConcepts: compactStrings([target]),
      })),
    };
  }

  const rustingTarget =
    firstMatch(question, /\bconditions?\s+for\s+(.+?)\s+and\b/i) ??
    firstMatch(question, /\b(.+?)\s+conditions?\s+and\b/i);
  if (rustingTarget && /\bprevent|prevention\b/i.test(question)) {
    const target = cleanConcept(rustingTarget);
    return {
      kind: "MULTI_PART",
      targetConcepts: compactStrings([target]),
      childRequirements: [
        {
          kind: "RELATION_MECHANISM_CONSEQUENCE",
          targetConcepts: compactStrings([target]),
          requestedRelation: `conditions for ${target}`,
        },
        {
          kind: "RELATION_MECHANISM_CONSEQUENCE",
          targetConcepts: compactStrings([target]),
          requestedRelation: `prevention method for ${target}`,
        },
      ],
    };
  }

  const parts = splitOnTopLevelAnd(question)
    .map((part) => cleanConcept(part.replace(/^\b(state|list|name|give|mention)\b/i, "")))
    .filter(Boolean);
  if (parts.length < 2) return undefined;

  return {
    kind: "MULTI_PART",
    targetConcepts: compactStrings(parts),
    childRequirements: parts.map((part) => ({
      kind: "CONCEPT_DEFINITION",
      targetConcepts: compactStrings([part, context.contextConcept]),
    })),
  };
}

function buildRelationRequirement(question: string): RequirementDraft | undefined {
  const transportLookup = question.match(
    /\bwhat\s+(.+?)\s+(carry|carries|transport|transports)\b/i
  );
  if (transportLookup) {
    const subject = cleanConcept(transportLookup[1] ?? "");
    const relation = normalizeRelationIntent(transportLookup[2] ?? "");
    const subjects = splitConjoinedConcepts(subject);
    if (subjects.length > 1) {
      return {
        kind: "MULTI_PART",
        targetConcepts: subjects,
        childRequirements: subjects.map((item) => ({
          kind: "RELATION_MECHANISM_CONSEQUENCE",
          targetConcepts: [item],
          requestedRelation: compactStrings([item, relation]).join(" "),
        })),
      };
    }
    return {
      kind: "RELATION_MECHANISM_CONSEQUENCE",
      targetConcepts: compactStrings([subject]),
      requestedRelation: compactStrings([subject, relation]).join(" "),
    };
  }

  const howAffectsMatch = question.match(
    /\bhow\s+(?:do|does)\s+(.+?)\s+(affect|change|increase|decrease|reduce|cause|lead to|turn|turns)\s+(.+?)(?:[?.]|$)/i
  );
  if (howAffectsMatch) {
    const cause = cleanConcept(howAffectsMatch[1] ?? "");
    const relation = normalizeRelationIntent(howAffectsMatch[2] ?? "");
    const target = cleanConcept(howAffectsMatch[3] ?? "");
    const causes = splitConjoinedConcepts(cause);
    if (causes.length > 1) {
      return {
        kind: "MULTI_PART",
        targetConcepts: compactStrings([target, ...causes]),
        childRequirements: causes.map((item) => ({
          kind: "RELATION_MECHANISM_CONSEQUENCE",
          targetConcepts: compactStrings([target, item]),
          requestedRelation: compactStrings([item, relation, target]).join(" "),
        })),
      };
    }
    return {
      kind: "RELATION_MECHANISM_CONSEQUENCE",
      targetConcepts: compactStrings([target, cause]),
      requestedRelation: compactStrings([cause, relation, target]).join(" "),
    };
  }

  const effectMatch = question.match(
    /\bwhat\s+effect\s+do(?:es)?\s+(.+?)\s+(?:have\s+)?(?:on|upon)\s+(.+?)(?:[?.]|$)/i
  );
  if (effectMatch) {
    const cause = cleanConcept(effectMatch[1] ?? "");
    const target = cleanConcept(effectMatch[2] ?? "");
    return {
      kind: "RELATION_MECHANISM_CONSEQUENCE",
      targetConcepts: compactStrings([target, cause]),
      requestedRelation: compactStrings([cause, "affect", target]).join(" "),
    };
  }

  const happensMatch = question.match(
    /\bwhat\s+happens\s+to\s+(.+?)\s+when\s+(.+?)(?:[?.]|$)/i
  );
  if (happensMatch) {
    const target = cleanConcept(happensMatch[1] ?? "");
    const cause = cleanConcept(happensMatch[2] ?? "");
    return {
      kind: "RELATION_MECHANISM_CONSEQUENCE",
      targetConcepts: compactStrings([target, cause]),
      requestedRelation: compactStrings([cause, "affect", target]).join(" "),
    };
  }

  const doToMatch = question.match(
    /\bwhat\s+do(?:es)?\s+(.+?)\s+do\s+to\s+(.+?)(?:[?.]|$)/i
  );
  if (doToMatch) {
    const cause = cleanConcept(doToMatch[1] ?? "");
    const target = cleanConcept(doToMatch[2] ?? "");
    return {
      kind: "RELATION_MECHANISM_CONSEQUENCE",
      targetConcepts: compactStrings([target, cause]),
      requestedRelation: compactStrings([cause, "affect", target]).join(" "),
    };
  }

  const affectMatch = question.match(
    /\bwhy\s+does\s+(.+?)\s+(affect|cause|lead to|change|increase|decrease)\s+(.+?)(?:[?.]|$)/i
  );
  if (affectMatch) {
    const cause = cleanConcept(affectMatch[1] ?? "");
    const relation = cleanConcept(affectMatch[2] ?? "");
    const target = cleanConcept(affectMatch[3] ?? "");
    return {
      kind: "RELATION_MECHANISM_CONSEQUENCE",
      targetConcepts: compactStrings([target, cause]),
      requestedRelation: compactStrings([cause, relation, target]).join(" "),
    };
  }

  const whyMatch = question.match(/\bwhy\s+(?:is|are|do|does|can)\s+(.+?)(?:[?.]|$)/i);
  if (!whyMatch) return undefined;

  const relation = cleanConcept(whyMatch[1] ?? "");
  return {
    kind: "RELATION_MECHANISM_CONSEQUENCE",
    targetConcepts: compactStrings([relation]),
    requestedRelation: relation,
  };
}

function buildProcessRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  if (/\bfood\s+chain\b/i.test(question) && /\bproducers?\b/i.test(question) && /\bconsumers?\b/i.test(question)) {
    return {
      kind: "MULTI_PART",
      targetConcepts: ["food chain", "producers", "consumers"],
      childRequirements: [
        {
          kind: "PROCESS_EXPLANATION",
          targetConcepts: ["food chain"],
          requestedProcess: "food chain",
          requestedFacet: "PROCESS",
        },
        {
          kind: "RELATION_MECHANISM_CONSEQUENCE",
          targetConcepts: ["producers"],
          requestedRelation: "producers function",
          requestedFacet: "FUNCTION",
        },
        {
          kind: "RELATION_MECHANISM_CONSEQUENCE",
          targetConcepts: ["consumers"],
          requestedRelation: "consumers function",
          requestedFacet: "FUNCTION",
        },
      ],
    };
  }

  const process =
    firstMatch(question, /\b(?:explain|describe)\s+(?:the\s+)?process\s+of\s+(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\b(?:explain|describe)\s+(.+?)(?:[?.]|$)/i);

  if (!process) return undefined;

  const cleaned = cleanConcept(process);
  if (/\b(formula|symbol|mean|represent)\b/i.test(cleaned)) return undefined;

  return {
    kind: "PROCESS_EXPLANATION",
    targetConcepts: compactStrings([cleaned, context.contextProcess]),
    requestedProcess: cleaned || context.contextProcess,
  };
}

function buildDefinitionRequirement(
  question: string,
  context: RequirementBuildContext
): RequirementDraft | undefined {
  if (/\bmain\s+idea\b/i.test(question) && /\bsupporting\s+details?\b/i.test(question)) {
    return {
      kind: "MULTI_PART",
      targetConcepts: ["main idea", "supporting details"],
      childRequirements: [
        {
          kind: "CONCEPT_DEFINITION",
          targetConcepts: ["main idea"],
          requestedFacet: "DEFINITION",
        },
        {
          kind: "CONCEPT_DEFINITION",
          targetConcepts: ["supporting details"],
          requestedFacet: "DEFINITION",
        },
      ],
    };
  }

  const concept =
    firstMatch(question, /\bwhat\s+about\s+(.+?)\s+in\s+(?:that|this)\s+topic(?:[?.]|$)/i) ??
    firstMatch(question, /\bwhat\s+(?:is|are)\s+(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\bwhat\s+does\s+(.+?)\s+(?:mean|means|refer to|describe)\b/i) ??
    firstMatch(question, /\btell\s+me\s+what\s+(.+?)\s+(?:mean|means|refer to|describe)\b/i) ??
    firstMatch(question, /\bdefine\s+(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\b(?:state|give)\s+(?:the\s+)?meaning\s+of\s+(.+?)(?:[?.]|$)/i) ??
    firstMatch(question, /\b(?:teach|answer|explain)\s+(?:the\s+)?(.+?)(?:[?.]|$)/i);

  if (!concept && !context.contextConcept) return undefined;

  if (!concept && context.contextConcept && /\bequivalent forms?\b/i.test(question)) {
    return {
      kind: "CONCEPT_DEFINITION",
      targetConcepts: compactStrings([`equivalent ${context.contextConcept}`]),
    };
  }

  return {
    kind: "CONCEPT_DEFINITION",
    targetConcepts: compactStrings([cleanConcept(concept ?? ""), context.contextConcept]),
  };
}

function buildPassageInterpretationRequirement(question: string): RequirementDraft | undefined {
  if (/\bmain\s+idea\b/i.test(question) && /\bsupporting\s+details?\b/i.test(question)) {
    return {
      kind: "MULTI_PART",
      targetConcepts: ["main idea", "supporting details"],
      requestedAction: detectRequestedAction(question) ?? "TEACH",
      presentationStyle: detectPresentationStyle(question),
      childRequirements: [
        {
          kind: "PASSAGE_INTERPRETATION",
          targetConcepts: ["main idea"],
          requestedFact: "main idea",
          passageTask: "MAIN_IDEA",
        },
        {
          kind: "PASSAGE_INTERPRETATION",
          targetConcepts: ["supporting details"],
          requestedFact: "supporting details",
          passageTask: "EXPLICIT_DETAIL",
        },
      ],
    };
  }

  if (/\bmain\s+idea\b/i.test(question) || /\bmainly\s+about\b/i.test(question) || /\bbest\s+summari[sz]es?\b/i.test(question)) {
    return {
      kind: "PASSAGE_INTERPRETATION",
      targetConcepts: ["main idea"],
      requestedFact: "main idea",
      passageTask: "MAIN_IDEA",
    };
  }

  if (
    /\b(?:what|which)\s+(?:detail|reason|fact)\s+(?:is\s+)?(?:stated|given|mentioned)\s+(?:in\s+)?(?:the\s+)?(?:passage|paragraph|text)?(?:[?.]|$)/i.test(
      question
    )
  ) {
    return {
      kind: "PASSAGE_INTERPRETATION",
      targetConcepts: [],
      requestedFact: "explicit stated detail",
      passageTask: "EXPLICIT_DETAIL",
    };
  }

  return undefined;
}

function withContext(
  draft: RequirementDraft,
  context: RequirementBuildContext
): RequirementDraft {
  return {
    ...draft,
    requestedAction: draft.requestedAction ?? context.requestedAction,
    presentationStyle: draft.presentationStyle ?? context.presentationStyle,
    ignoredDirectiveText: optionalUnique([
      ...(draft.ignoredDirectiveText ?? []),
      ...(context.ignoredDirectiveText ?? []),
    ]),
    dependsOnPreviousTurn: context.dependsOnPreviousTurn ? true : draft.dependsOnPreviousTurn,
    childRequirements: draft.childRequirements?.map((child) =>
      withContext(child, context)
    ),
  };
}

function assignRequirementIds(
  drafts: RequirementDraft[],
  subjectId: string,
  topicId?: string
): RequestRequirement[] {
  return drafts.map((draft, index) =>
    assignRequirementId(draft, `req-${index + 1}`, subjectId, topicId)
  );
}

function assignRequirementId(
  draft: RequirementDraft,
  id: string,
  subjectId: string,
  topicId?: string
): RequestRequirement {
  const semantic = buildSemanticEnrichment(draft, subjectId, topicId);
  return {
    id,
    kind: draft.kind,
    subjectId,
    topicId,
    targetConcepts: uniqueStrings(draft.targetConcepts),
    baseConcept: semantic.baseConcept,
    requestedAction: draft.requestedAction,
    presentationStyle: draft.presentationStyle,
    requestedFacet: draft.requestedFacet ?? semantic.requestedFacet,
    constraints: optionalUnique([...(draft.constraints ?? []), ...semantic.constraints]),
    ignoredDirectiveText: optionalUnique(draft.ignoredDirectiveText),
    requiredSemanticComponents: optionalSemanticComponents([
      ...(draft.requiredSemanticComponents ?? []),
      ...semantic.requiredSemanticComponents,
    ]),
    requiredSymbols: optionalUnique(draft.requiredSymbols),
    requiredInputs: optionalUnique(draft.requiredInputs),
    requiredInputConcepts: optionalUnique(draft.requiredInputConcepts),
    comparisonSides: optionalUnique(draft.comparisonSides),
    requestedRelation: draft.requestedRelation,
    requestedProcess: draft.requestedProcess,
    requestedFact: draft.requestedFact,
    requestedEvent: draft.requestedEvent,
    requestedMethod: draft.requestedMethod,
    passageTask: draft.passageTask,
    dependsOnPreviousTurn: draft.dependsOnPreviousTurn || undefined,
    childRequirements: draft.childRequirements?.map((child, index) =>
      assignRequirementId(child, `${id}.${index + 1}`, subjectId, topicId)
    ),
  };
}

function buildSemanticEnrichment(
  draft: RequirementDraft,
  subjectId: string,
  topicId?: string
): {
  baseConcept?: RequestRequirement["baseConcept"];
  requestedFacet?: SemanticFacet;
  constraints: string[];
  requiredSemanticComponents: SemanticComponent[];
} {
  const requestedFacet = draft.requestedFacet ?? facetForRequirement(draft);
  const primaryTarget = primarySemanticTarget(draft);
  const baseConcept = primaryTarget
    ? canonicalizeSemanticConcept({
        rawConcept: primaryTarget,
        subjectId,
        topicId,
        facet: requestedFacet,
      })
    : undefined;
  const constraints = draft.constraints ?? [];
  const components: SemanticComponent[] = [];

  if (baseConcept && requestedFacet) {
    components.push(
      makeSemanticComponent({
        kind: requestedFacet,
        concept: baseConcept,
        constraints,
        text: primaryTarget,
      })
    );
  }

  for (const symbol of draft.requiredSymbols ?? []) {
    components.push(
      makeSemanticComponent({
        kind: "SYMBOL",
        symbol: cleanSymbolToken(symbol).toLowerCase(),
        text: symbol,
      })
    );
  }

  for (const side of draft.comparisonSides ?? []) {
    const sideConcept = canonicalizeSemanticConcept({
      rawConcept: side,
      subjectId,
      topicId,
      facet: "DEFINITION",
    });
    if (sideConcept) {
      components.push(
        makeSemanticComponent({
          kind: "COMPARISON_SIDE",
          concept: sideConcept,
          text: side,
        })
      );
    }
  }

  for (const input of draft.requiredInputs ?? []) {
    components.push(
      makeSemanticComponent({
        kind: "QUANTITY",
        concept: baseConcept,
        text: input,
      })
    );
  }

  return {
    baseConcept,
    requestedFacet,
    constraints,
    requiredSemanticComponents: components,
  };
}

function facetForRequirement(draft: RequirementDraft): SemanticFacet | undefined {
  if (draft.requestedFacet) return draft.requestedFacet;
  switch (draft.kind) {
    case "CONCEPT_DEFINITION":
    case "CONTEXTUAL_FOLLOW_UP":
      return inferRequestedFacet(
        `${draft.requestedAction ?? ""} ${draft.requestedFact ?? ""} ${draft.targetConcepts.join(" ")}`
      );
    case "FORMULA":
    case "FORMULA_WITH_SYMBOLS":
      return "FORMULA";
    case "CALCULATION":
      return "METHOD";
    case "RELATION_MECHANISM_CONSEQUENCE":
      return "CONSEQUENCE";
    case "PROCESS_EXPLANATION":
      return "PROCESS";
    case "PROCEDURE_METHOD":
      return "METHOD";
    case "FACT_LOOKUP":
      return draft.requestedFacet ?? "DEFINITION";
    case "PASSAGE_INTERPRETATION":
      return "DEFINITION";
    case "COMPARISON":
    case "MULTI_OPTION_COMPARISON":
    case "MULTI_PART":
    case "SYMBOL_DEFINITION":
      return undefined;
  }
}

function primarySemanticTarget(draft: RequirementDraft): string | undefined {
  if (draft.kind === "SYMBOL_DEFINITION") return undefined;
  const raw =
    draft.targetConcepts[0] ??
    draft.requestedProcess ??
    draft.requestedMethod ??
    draft.requestedFact ??
    draft.requestedRelation;
  if (!raw) return undefined;
  const cleaned = normalizeSemanticBaseConcept(raw, draft.requestedFacet ?? facetForRequirement(draft));
  return cleaned || undefined;
}

function buildSafetyIntent(activeQuestion: string, quotedSegments: string[]): RequestSafetyIntent {
  return {
    asksForCurrentExternalInfo: asksForCurrentExternalInfo(activeQuestion),
    containsHostileQuotedText: quotedSegments.some(isHostileInstruction),
    asksToIgnoreSources: asksToIgnoreSources(activeQuestion),
  };
}

function extractDirectiveMetadata(question: string): {
  educationalQuestion: string;
  ignoredDirectiveText: string[];
} {
  const ignoredDirectiveText: string[] = [];
  let educationalQuestion = question;
  const directivePatterns = [
    /\b(ignore|bypass|override|disregard)\b.{0,80}\b(source|evidence|citation|resource|context|instruction)s?(?:\s+limits?)?\b/gi,
    /\b(?:answer|use)\b.{0,50}\b(?:from memory|general knowledge|outside sources?)\b/gi,
    /\buse\s+source[_\s-]*\d+\b/gi,
    /\buse only the source label(?: the server gives you)?\b/gi,
  ];

  for (const pattern of directivePatterns) {
    educationalQuestion = educationalQuestion.replace(pattern, (match) => {
      ignoredDirectiveText.push(normalizeQuestion(match));
      return " ";
    });
  }

  educationalQuestion = normalizeQuestion(
    ignoredDirectiveText.length > 0
      ? educationalQuestion
          .replace(/\b(?:and|but)\s+(?:answer|explain|tell me|state)\b/gi, " ")
          .replace(/\b(?:and|but)\s*$/i, " ")
          .replace(/^\b(?:answer|tell me)\b\s+/i, "")
          .replace(/\s+/g, " ")
      : educationalQuestion
  );
  const leftoverTokens = educationalQuestion.toLowerCase().replace(/[^a-z]+/g, " ").trim();
  if (/^(?:and|but|then)?$/.test(leftoverTokens)) {
    educationalQuestion = "";
  }

  if (!educationalQuestion && ignoredDirectiveText.length > 0) {
    const fallbackTarget =
      firstMatch(question, /\b(?:answer|explain|tell me|state)\s+(.+?)\s+from\s+memory\b/i) ??
      firstMatch(question, /\b(?:answer|explain|tell me|state)\s+(.+?)(?:[?.]|$)/i);
    const cleanedFallback = normalizeQuestion(fallbackTarget ?? "");
    educationalQuestion =
      cleanedFallback && !/^(?:from memory|general knowledge|outside sources?)$/i.test(cleanedFallback)
        ? normalizeQuestion(`what is ${cleanedFallback}`)
        : "";
  }

  return {
    educationalQuestion: educationalQuestion || (ignoredDirectiveText.length > 0 ? "" : question),
    ignoredDirectiveText: uniqueStrings(ignoredDirectiveText),
  };
}

function asksForCurrentExternalInfo(question: string): boolean {
  const lower = question.toLowerCase();
  if (/\belectric(?:ity)?\s+current\b|\bcurrent\s+(?:symbol|formula|flows?|in\s+a\s+circuit)\b/.test(lower)) {
    return false;
  }

  return /\b(latest|today|yesterday|tomorrow|this year|up[- ]to[- ]date|real[- ]time|recent|news|deadline|registration|internet|online|web)\b/.test(
    lower
  ) || /\bcurrent\s+(?:affairs?|news|events?|exchange rates?|prices?|weather|deadline|registration|syllabus|announcement|status|version)\b/.test(lower);
}

function asksToIgnoreSources(question: string): boolean {
  return /\b(ignore|bypass|override|disregard)\b.{0,60}\b(source|evidence|citation|resource|context|instruction)s?\b/i.test(
    question
  ) || /\b(answer|use)\b.{0,40}\b(from memory|general knowledge|outside sources?)\b/i.test(question);
}

function isHostileInstruction(text: string): boolean {
  return asksToIgnoreSources(text) ||
    /\b(system prompt|developer message|hidden instruction|source limits?|do not cite|ignore all)\b/i.test(
      text
    );
}

function extractExplicitQuotedTask(
  question: string,
  quotedSegments: string[]
): string | undefined {
  if (quotedSegments.length === 0) return undefined;
  if (
    !/\b(solve|answer|calculate|work out|do)\b.{0,40}\b(question|problem|task|this)\b/i.test(
      question
    )
  ) {
    return undefined;
  }

  return normalizeQuestion(quotedSegments[0] ?? "");
}

function removeNonTaskHostileQuotes(question: string, quotedSegments: string[]) {
  let active = question;
  for (const segment of quotedSegments) {
    if (!isHostileInstruction(segment)) continue;
    active = active.replace(`"${segment}"`, "").replace(`'${segment}'`, "");
  }
  return normalizeQuestion(active);
}

function extractQuotedSegments(question: string): string[] {
  const segments: string[] = [];
  const quotedPattern = /"([^"]+)"|'([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = quotedPattern.exec(question)) !== null) {
    segments.push(normalizeQuestion(match[1] ?? match[2] ?? ""));
  }
  return segments;
}

function resolveRecentContext(messages: RequestContextMessage[], limit: number) {
  const bounded = messages.slice(-Math.max(0, limit));
  for (const message of [...bounded].reverse()) {
    if (message.role !== "USER") continue;
    const concept = extractLikelyConcept(message.content);
    if (concept) {
      return { concept, process: concept };
    }
  }

  return { concept: undefined, process: undefined };
}

function isContextualFollowUp(question: string): boolean {
  return /\b(it|its|that|this|this quantity|that quantity|that process|that formula)\b/i.test(
    question
  ) || /\b(equivalent forms?|these forms?|those forms?)\b/i.test(question);
}

function isPronounOnlyFollowUp(question: string): boolean {
  return /\b(?:it|its|that|this|this quantity|that quantity|that process|that formula)\b/i.test(
    question
  );
}

function hasNamedPossessiveFacetTarget(question: string): boolean {
  return /\b(?:teach|explain|tell\s+me|define|what\s+is)\s+(?:me\s+)?(?:the\s+)?(?!it\b|its\b|this\b|that\b)([a-z][a-z0-9 -]+?)\s+(?:and|including|with)\s+(?:its\s+|the\s+)?(?:units?|formula)\b/i.test(
    question
  );
}

function hasExplicitCurrentConcept(question: string): boolean {
  const candidates = compactStrings([
    extractFormulaConcept(question),
    extractPrimarySymbolRequest(question),
    extractLikelyConcept(question),
  ]).filter((candidate) => !isContextOnlyConceptCandidate(candidate));
  return candidates.length > 0;
}

function extractLikelyConcept(question: string): string | undefined {
  const normalized = normalizeQuestion(question);
  const candidates = [
    firstMatch(normalized, /\b(?:teach|explain|tell\s+me|define|what\s+is)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+(?:and|including|with)\s+(?:its\s+|the\s+)?units?(?:[?.]|$)/i),
    firstMatch(normalized, /\bwhat\s+(?:is|are)\s+(.+?)(?:[?.]|$)/i),
    firstMatch(normalized, /\bdefine\s+(.+?)(?:[?.]|$)/i),
    firstMatch(normalized, /\bformula\s+(?:for|of)\s+(.+?)(?:[?.]|$)/i),
    firstMatch(normalized, /\b(.+?)\s+formula(?:[?.]|$)/i),
    firstMatch(normalized, /\b(?:explain|describe)\s+(?:the\s+process\s+of\s+)?(.+?)(?:[?.]|$)/i),
  ];

  return compactStrings(candidates.map((candidate) => cleanConcept(candidate ?? "")))[0];
}

function isContextOnlyConceptCandidate(value: string): boolean {
  return /^(?:it|its|s|that|this|formula|unit|units|the formula|its formula|s formula|its unit|s unit|its units|s units)$/i.test(
    normalizeQuestion(value)
  );
}

function detectRequestedAction(question: string): string | undefined {
  if (/\bwhen\s+(?:should|would|do)\b.+\b(?:instead\s+of|rather\s+than)\b/i.test(question)) {
    return "SELECT_METHOD";
  }
  if (/\b(?:work\s+through|walk\s+(?:me\s+)?through|go\s+through)\b/i.test(question)) {
    return "WORK_THROUGH";
  }
  if (/\bcompare|distinguish|differentiate|instead\s+of|rather\s+than\b/i.test(question)) {
    return "COMPARE";
  }
  if (/\bdefine\b/i.test(question)) return "DEFINE";
  if (/\bteach\b/i.test(question)) return "TEACH";
  if (/\bexplain|show\s+me|show\b/i.test(question)) return "EXPLAIN";
  if (/\btell\s+me|what\s+is|what\s+are|what\s+does\b/i.test(question)) return "DEFINE";
  return undefined;
}

function detectPresentationStyle(question: string): PresentationStyle | undefined {
  if (/\b(?:step\s+by\s+step|work\s+through|walk\s+(?:me\s+)?through|go\s+through)\b/i.test(question)) {
    return "STEP_BY_STEP";
  }
  if (/\b(?:simple\s+terms|simply|basic|beginner)\b/i.test(question)) {
    return "SIMPLE";
  }
  if (/\b(?:briefly|concise|short)\b/i.test(question)) {
    return "CONCISE";
  }
  return undefined;
}

function extractFormulaConcept(question: string): string {
  const shapeArea =
    firstMatch(question, /\barea\s+of\s+(?:a\s+)?(circle|triangle|rectangle|parallelogram)\s+formula\b/i) ??
    firstMatch(question, /\b(circle|triangle|rectangle|parallelogram)\s+area\s+formula\b/i);
  if (shapeArea) return `area of ${cleanConcept(shapeArea)}`;

  if (/\bcircle\s+boundary\s+formula\b/i.test(question)) return "circle boundary";

  const direct =
    firstMatch(question, /\bformula\s+(?:for|of)\s+(.+?)(?:\s+and\b|[?.]|$)/i) ??
    firstMatch(question, /\b(?:give|state|write|what\s+is|teach|explain)\s+(?:the\s+)?(.+?)\s+formula(?:\s+and\b|[?.]|$)/i);

  return cleanConcept(direct ?? "");
}

function inferFormulaUnitTarget(
  question: string,
  context: RequirementBuildContext
): string | undefined {
  const lower = question.toLowerCase();
  if (/\bvoltage\b/.test(lower) && /\bcurrent\b/.test(lower) && /\bresistance\b/.test(lower)) {
    return "ohm's law";
  }
  if (/\bdensity\b/.test(lower)) return "density";
  if (/\bspeed\b/.test(lower)) return "speed";
  if (/\bforce\b/.test(lower) || /\bf\s*=\s*m\s*(?:x|\*)\s*a\b/i.test(question)) {
    return "force";
  }
  if (/\bpower\b/.test(lower) || /\bp\s*=\s*(?:v\s*(?:x|\*)\s*i|i\s*(?:x|\*)\s*v)\b/i.test(question)) {
    return "power";
  }
  if (/\bohm'?s?\s+law\b/i.test(question) || /\bv\s*=\s*i\s*(?:x|\*)\s*r\b/i.test(question)) {
    return "ohm's law";
  }

  const formulaConcept = extractFormulaConcept(question);
  if (formulaConcept) return formulaConcept;

  const unitConcept =
    firstMatch(
      question,
      /\bwhat\s+(?:is|are)\s+(.+?)\s+and\s+what\s+units?\s+(?:is|are)\s+(?:it|they|this|that)\s+measured\s+in(?:[?.]|$)/i
    ) ??
    firstMatch(
      question,
      /\b(?:teach|explain|tell\s+me|define|what\s+is)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+(?:and|including|with)\s+(?:its\s+|the\s+)?units?(?:[?.]|$)/i
    ) ??
    firstMatch(
      question,
      /\bwhat\s+unit\s+(?:is|are)\s+(.+?)\s+measured\s+in(?:[?.]|$)/i
    );
  return cleanConcept(unitConcept ?? context.contextConcept ?? "");
}

function inferUnitFactTarget(question: string, concept: string): string {
  const lower = question.toLowerCase();
  if (/\bvoltage\b/.test(lower) && /\bcurrent\b/.test(lower) && /\bresistance\b/.test(lower)) {
    return "voltage current resistance";
  }
  return concept;
}

function extractPrimarySymbolRequest(question: string): string | undefined {
  const patterns = [
    /\bwhat\s+does\s+([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)\s+(?:mean|represent|stand for)\b/i,
    /\bwhat\s+is\s+([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)\s+in\s+(?:the\s+)?formula\b/i,
    /\bidentify\s+([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)\b/i,
    /\bstate\s+what\s+([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)\s+(?:means|represents|stands for)\b/i,
    /\bdefine\s+([A-Za-z\u0370-\u03ff][A-Za-z0-9\u0370-\u03ff]*)(?:[?.]|$)/i,
    /\bwhat\s+is\s+([A-Za-z\u0370-\u03ff])(?:[?.]|$)/i,
  ];

  for (const pattern of patterns) {
    const symbol = firstMatch(question, pattern);
    if (symbol && isSymbolToken(symbol)) return symbol;
  }

  return undefined;
}

function extractRequestedSymbols(question: string): string[] {
  const symbols = new Set<string>();
  const symbolClauses = [
    ...question.matchAll(/\bdefine\s+(.+?)(?:[?.]|$)/gi),
    ...question.matchAll(/\bexplain\s+what\s+(.+?)\s+(?:means?|represents?|stands for)(?:[?.]|$)/gi),
    ...question.matchAll(/\bwhat\s+(.+?)\s+(?:means?|represents?|stands for)(?:[?.]|$)/gi),
  ];

  for (const clause of symbolClauses) {
    const raw = clause[1] ?? "";
    for (const token of raw.split(/\s*(?:,|and|&)\s*/i)) {
      const cleaned = cleanSymbolToken(token);
      if (cleaned && isSymbolToken(cleaned)) symbols.add(cleaned);
    }
  }

  const primary = extractPrimarySymbolRequest(question);
  if (primary) symbols.add(primary);

  return [...symbols];
}

function extractNumericInputs(question: string): string[] {
  const inputs = new Set<string>();
  for (const match of question.matchAll(/\b[A-Za-z]\s*=\s*[-+]?\d+(?:\.\d+)?\s*[A-Za-z0-9/^²³%]*\b/g)) {
    inputs.add(normalizeQuestion(match[0] ?? ""));
  }
  for (const match of question.matchAll(/\b[-+]?\d+(?:\.\d+)?\s*[A-Za-z]+(?:\/[A-Za-z]+)?\b/g)) {
    const input = normalizeQuestion(match[0] ?? "");
    if (!/\b(?:give|gives|is|are|so|then|from|with|using)\b$/i.test(input)) {
      inputs.add(input);
    }
  }
  if (/\b(percent|percentage|discount|increase|decrease|sale price|new value)\b/i.test(question)) {
    for (const match of question.matchAll(/\b[-+]?\d+(?:\.\d+)?\b/g)) {
      inputs.add(normalizeQuestion(match[0] ?? ""));
    }
  }
  return [...inputs];
}

function extractNamedCalculationInputs(question: string): string[] {
  const named = new Set<string>();
  for (const match of question.matchAll(
    /\b(?:using|with|given)\s+([a-z][a-z ,/-]+?)(?:[?.]|$)/gi
  )) {
    for (const item of splitNamedInputs(match[1] ?? "")) {
      named.add(item);
    }
  }
  return [...named];
}

function splitNamedInputs(value: string): string[] {
  return value
    .replace(/\band\b/gi, ",")
    .split(",")
    .map(cleanConcept)
    .filter((item) => item.length > 0);
}

function extractRatioValue(question: string): string | undefined {
  const match = question.match(/\b(\d+)\s*(?::|to)\s*(\d+)\b/i);
  if (!match) return undefined;
  return `${match[1]}:${match[2]}`;
}

function splitConjoinedConcepts(value: string): string[] {
  return value
    .split(/\s+and\s+/i)
    .map(cleanConcept)
    .filter(Boolean);
}

function splitOnTopLevelAnd(question: string): string[] {
  return question.split(/\s+and\s+/i).map(normalizeQuestion);
}

function cleanWorkedExampleTarget(value: string): string {
  return cleanConcept(value)
    .replace(/\b(?:example|worked example)\b/g, " example")
    .replace(/\s+/g, " ")
    .trim();
}

function inferOptionSides(question: string): string[] {
  const explicit = [...question.matchAll(/\b(pack|option|choice)\s+([A-Za-z0-9]+)\b/gi)]
    .map((match) => `${(match[1] ?? "option").toLowerCase()} ${match[2] ?? ""}`.trim());
  if (explicit.length >= 2) return uniqueStrings(explicit);
  if (/\btwo\b/i.test(question)) return ["option 1", "option 2"];
  if (/\bthree\b/i.test(question)) return ["option 1", "option 2", "option 3"];
  return ["option 1", "option 2"];
}

function firstMatch(value: string, pattern: RegExp): string | undefined;
function firstMatch(value: string, pattern: RegExp, mode: "pair"): string[] | undefined;
function firstMatch(
  value: string,
  pattern: RegExp,
  mode?: "pair"
): string | string[] | undefined {
  const match = value.match(pattern);
  if (!match) return undefined;
  if (mode === "pair") {
    return compactStrings([match[1], match[2]].map((item) => item ?? ""));
  }
  return match[1];
}

function cleanConcept(value: string): string {
  const cleaned = normalizeQuestion(value)
    .replace(/[?.!]+$/g, "")
    .replace(/\baccording\s+to\s+(?:the\s+)?(?:[a-z0-9 -]+?\s+)?(?:cards?|notes?|sources?|evidence)\b/gi, " ")
    .replace(/\b(?:using|from|with)\s+(?:these|the|this|two)?\s*(?:[a-z0-9]+\s+){0,3}(?:notes?|cards?|sources?|evidence|formula notes?)$/i, "")
    .replace(/\s+as\s+.+$/i, "")
    .replace(/\s+and\s+(?:name|define|identify|explain)\s+(?:the\s+)?(?:variables?|symbols?)$/i, "")
    .replace(/\s+and\s+what\s+(?:do|does|is|are)\s+.+$/i, "")
    .replace(/\s+(?:and|or)$/i, "")
    .replace(/\s+in\s+(?:physics|chemistry|biology|mathematics|maths|english|geography|science)$/i, "")
    .replace(/\s+in\s+simple\s+terms$/i, "")
    .replace(/\s+for\s+me$/i, "")
    .replace(/^(?:please\s+)?(?:teach|explain|show\s+me|show|tell\s+me|help\s+me\s+understand|work\s+through|walk\s+(?:me\s+)?through|go\s+through)\s+/i, "")
    .replace(/\s+of\s+(?:a\s+|an\s+|the\s+)?(?:paragraph|passage|text)$/i, "")
    .replace(/^(?:a|an|the|this|that|its)(?:\s+|$)/i, "")
    .replace(/\b(?:formula|process|method|rule|conditions?|ways?|one|two|three|cards?|notes?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return /^(?:it|its|that|this|this quantity|that quantity|that process|that formula)$/.test(
    cleaned
  )
    ? ""
    : cleaned;
}

function cleanCalculationTarget(value: string): string {
  const cleaned = cleanConcept(value)
    .replace(/\b(?:runner|motor|lamp|heater|sample|loan|complete|card|journey)\b'?s?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/\bspeed\b/.test(cleaned)) return "speed";
  if (/\bdensity\b/.test(cleaned)) return "density";
  if (/\belectrical\s+power\b|\bpower\b/.test(cleaned)) return "electrical power";
  if (/\bresultant\s+force\b|\bforce\b/.test(cleaned)) return "resultant force";
  if (/\bsimple\s+interest\b/.test(cleaned)) return "simple interest";
  if (/\bpercentage\s+change\b/.test(cleaned)) return "percentage change";
  return cleaned;
}

function normalizeComparisonSides(sides: string[]): string[] {
  if (sides.length !== 2) return sides;
  const [left, right] = sides;
  if (!left || !right) return sides;
  const rightNorm = normalizeQuestion(right).toLowerCase();
  if (rightNorm.includes("resistance") && /^(?:series|parallel)$/.test(left)) {
    return [`${left} resistance rule`, right];
  }
  if (rightNorm.includes("circuit resistance") && /^(?:series|parallel)$/.test(left)) {
    return [`${left} circuit resistance rule`, right];
  }
  return sides;
}

function cleanMethod(value: string): string {
  return normalizeQuestion(value)
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeEventPhrase(value: string): string {
  const cleaned = cleanConcept(value);
  if (/\brolling\s+an\s+even\s+number\b/i.test(cleaned)) {
    return cleaned.replace(/\s+/g, " ").trim();
  }
  return cleaned
    .replace(/\b(?:an?\s+)?even\s+number\b/i, "rolling an even number")
    .replace(/\ba\s+head\b/i, "getting heads")
    .replace(/\bheads\b/i, "getting heads")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRelationIntent(value: string): string {
  const cleaned = normalizeQuestion(value).toLowerCase();
  if (/^(?:affect|change|turn|turns)$/.test(cleaned)) return "affect";
  if (/^(?:carry|carries|transport|transports)$/.test(cleaned)) return "transport";
  return cleaned;
}

function cleanSymbolToken(value: string): string {
  return normalizeQuestion(value)
    .replace(/[?.!,;:]+$/g, "")
    .replace(/^(?:the|a|an)\s+/i, "")
    .trim();
}

function isSymbolToken(value: string): boolean {
  const cleaned = cleanSymbolToken(value);
  if (SYMBOL_NAMES.has(cleaned.toLowerCase())) return true;
  return /^[A-Za-z\u0370-\u03ff]{1,2}$/.test(cleaned);
}

function compactStrings(values: Array<string | undefined>): string[] {
  return values
    .map((value) => normalizeQuestion(value ?? ""))
    .filter((value) => value.length > 0);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(normalizeQuestion).filter(Boolean))];
}

function optionalUnique(values: string[] | undefined): string[] | undefined {
  if (!values) return undefined;
  const unique = uniqueStrings(values);
  return unique.length > 0 ? unique : undefined;
}

function optionalSemanticComponents(
  values: SemanticComponent[]
): SemanticComponent[] | undefined {
  const unique = new Map<string, SemanticComponent>();
  for (const value of values) {
    const key = [
      value.kind,
      value.concept?.baseConcept ?? "",
      value.concept?.facet ?? "",
      value.symbol ?? "",
      value.relation ?? "",
      value.object ?? "",
      value.text ?? "",
    ].join(":");
    unique.set(key, value);
  }
  const result = [...unique.values()];
  return result.length > 0 ? result : undefined;
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
