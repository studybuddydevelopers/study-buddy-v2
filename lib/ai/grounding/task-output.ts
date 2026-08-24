import { z } from "zod";
import type { GenerateMessage, StructuredOutputSchema } from "@/lib/ai/chat/types";
import type { AnswerabilityDecision } from "./answerability/types";
import type {
  SemanticQuantityBinding,
  ValidatedEvidenceUnit,
} from "./evidence-units/validated-evidence-unit";
import type { EvidenceCapability } from "./capabilities/types";
import type { RequestRequirement, RequestRequirements } from "./requirements/types";
import type { GroundedTeachAnswerSegment } from "./structured-output";
import type {
  CalculationExpression,
  ValidatedCalculationTrace,
} from "./calculation/types";
import {
  binaryExpression,
  constantExpression,
  valueExpression,
} from "./calculation/deterministic-calculation-executor";

export type TaskOutputMode =
  | "GENERAL_PROSE"
  | "STRUCTURED_CALCULATION"
  | "STRUCTURED_FORMULA";

export type StructuredTaskValidationErrorCode =
  | "INVALID_SCHEMA"
  | "UNKNOWN_SOURCE_LABEL"
  | "MISSING_REQUIRED_STEP"
  | "UNAUTHORISED_TARGET_QUANTITY"
  | "UNSUPPORTED_OPERAND"
  | "UNSUPPORTED_OPERATION"
  | "INCORRECT_RESULT"
  | "WRONG_SEMANTIC_BINDING"
  | "CONTRADICTORY_ASSIGNMENT"
  | "UNAUTHORISED_DEPENDENCY"
  | "CIRCULAR_DEPENDENCY"
  | "MISSING_REQUIRED_VARIABLE"
  | "DUPLICATE_VARIABLE"
  | "UNSUPPORTED_SYMBOL"
  | "INCORRECT_VARIABLE_MEANING"
  | "MISSING_REQUIRED_UNIT"
  | "UNSUPPORTED_UNIT"
  | "INCORRECT_UNIT"
  | "MISSING_REQUIRED_CONDITION"
  | "UNSUPPORTED_RELATION"
  | "UNSUPPORTED_EXPRESSION"
  | "INCOMPLETE_CALCULATION_PLAN"
  | "MISSING_INPUT_BINDING"
  | "MISSING_AUTHORISED_METHOD"
  | "UNREACHABLE_FINAL_TARGET"
  | "AMBIGUOUS_QUANTITY_BINDING"
  | "INVALID_CALCULATION_GRAPH"
  | "REFERENCE_RESULT_MISMATCH"
  | "DIVISION_BY_ZERO"
  | "NON_FINITE_RESULT"
  | "INCOMPATIBLE_UNITS";

export type StructuredTaskValidationError = {
  code: StructuredTaskValidationErrorCode;
  message: string;
  path?: string;
};

export const structuredCalculationOutputSchema: StructuredOutputSchema = {
  name: "capability_structured_calculation_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "steps",
      "finalQuantity",
      "finalResult",
      "finalUnit",
      "sourceLabels",
      "suggestedQuestions",
    ],
    properties: {
      steps: {
        type: "array",
        minItems: 1,
        maxItems: 12,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "targetQuantity",
            "expression",
            "result",
            "unit",
            "sourceLabels",
          ],
          properties: {
            targetQuantity: { type: "string", minLength: 1, maxLength: 80 },
            expression: { type: "string", minLength: 1, maxLength: 160 },
            result: { type: "string", minLength: 1, maxLength: 80 },
            unit: { type: "string", maxLength: 40 },
            sourceLabels: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: { type: "string", pattern: "^SOURCE_[1-9][0-9]*$" },
            },
          },
        },
      },
      finalQuantity: { type: "string", minLength: 1, maxLength: 80 },
      finalResult: { type: "string", minLength: 1, maxLength: 80 },
      finalUnit: { type: "string", maxLength: 40 },
      sourceLabels: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: { type: "string", pattern: "^SOURCE_[1-9][0-9]*$" },
      },
      suggestedQuestions: {
        type: "array",
        maxItems: 3,
        items: { type: "string", minLength: 1, maxLength: 160 },
      },
    },
  },
};

export const structuredFormulaOutputSchema: StructuredOutputSchema = {
  name: "capability_structured_formula_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "expression",
      "variables",
      "units",
      "conditions",
      "sourceLabels",
      "suggestedQuestions",
    ],
    properties: {
      expression: { type: "string", minLength: 1, maxLength: 220 },
      variables: {
        type: "array",
        maxItems: 12,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["symbol", "meaning", "sourceLabels"],
          properties: {
            symbol: { type: "string", minLength: 1, maxLength: 40 },
            meaning: { type: "string", minLength: 1, maxLength: 100 },
            sourceLabels: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: { type: "string", pattern: "^SOURCE_[1-9][0-9]*$" },
            },
          },
        },
      },
      units: {
        type: "array",
        maxItems: 12,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["quantity", "unit", "sourceLabels"],
          properties: {
            quantity: { type: "string", minLength: 1, maxLength: 80 },
            unit: { type: "string", minLength: 1, maxLength: 60 },
            sourceLabels: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: { type: "string", pattern: "^SOURCE_[1-9][0-9]*$" },
            },
          },
        },
      },
      conditions: {
        type: "array",
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["text", "sourceLabels"],
          properties: {
            text: { type: "string", minLength: 1, maxLength: 220 },
            sourceLabels: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: { type: "string", pattern: "^SOURCE_[1-9][0-9]*$" },
            },
          },
        },
      },
      sourceLabels: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: { type: "string", pattern: "^SOURCE_[1-9][0-9]*$" },
      },
      suggestedQuestions: {
        type: "array",
        maxItems: 3,
        items: { type: "string", minLength: 1, maxLength: 160 },
      },
    },
  },
};

const structuredCalculationStepSchema = z
  .object({
    targetQuantity: z.string().trim().min(1).max(80),
    expression: z.string().trim().min(1).max(160),
    result: z.string().trim().min(1).max(80),
    unit: z.string().max(40),
    sourceLabels: z.array(z.string().regex(/^SOURCE_[1-9][0-9]*$/)).min(1).max(8),
  })
  .strict();

const structuredCalculationSchema = z
  .object({
    steps: z.array(structuredCalculationStepSchema).min(1).max(12),
    finalQuantity: z.string().trim().min(1).max(80),
    finalResult: z.string().trim().min(1).max(80),
    finalUnit: z.string().max(40),
    sourceLabels: z.array(z.string().regex(/^SOURCE_[1-9][0-9]*$/)).min(1).max(8),
    suggestedQuestions: z.array(z.string().trim().min(1).max(160)).max(3),
  })
  .strict();

const structuredFormulaSchema = z
  .object({
    expression: z.string().trim().min(1).max(220),
    variables: z
      .array(
        z
          .object({
            symbol: z.string().trim().min(1).max(40),
            meaning: z.string().trim().min(1).max(100),
            sourceLabels: z
              .array(z.string().regex(/^SOURCE_[1-9][0-9]*$/))
              .min(1)
              .max(8),
          })
          .strict()
      )
      .max(12),
    units: z
      .array(
        z
          .object({
            quantity: z.string().trim().min(1).max(80),
            unit: z.string().trim().min(1).max(60),
            sourceLabels: z
              .array(z.string().regex(/^SOURCE_[1-9][0-9]*$/))
              .min(1)
              .max(8),
          })
          .strict()
      )
      .max(12),
    conditions: z
      .array(
        z
          .object({
            text: z.string().trim().min(1).max(220),
            sourceLabels: z
              .array(z.string().regex(/^SOURCE_[1-9][0-9]*$/))
              .min(1)
              .max(8),
          })
          .strict()
      )
      .max(8),
    sourceLabels: z.array(z.string().regex(/^SOURCE_[1-9][0-9]*$/)).min(1).max(8),
    suggestedQuestions: z.array(z.string().trim().min(1).max(160)).max(3),
  })
  .strict();

export type StructuredCalculationOutput = z.infer<typeof structuredCalculationSchema>;
export type StructuredFormulaOutput = z.infer<typeof structuredFormulaSchema>;

export type StructuredTaskValidationResult<T> =
  | { supported: true; output: T; errors: [] }
  | { supported: false; errors: StructuredTaskValidationError[]; output?: undefined };

export type CalculationValueOrigin =
  | "GIVEN_INPUT"
  | "DERIVED_INTERMEDIATE"
  | "FINAL_RESULT"
  | "REFERENCE_RESULT";

export type CalculationContract = {
  quantities: Array<{
    quantity: string;
    calculationKey: string;
    value: string;
    role: string;
    origin: CalculationValueOrigin;
    unit?: string;
    sourceLabels: string[];
  }>;
  authorisedMethods: Array<{
    targetQuantity: string;
    outputQuantity: string;
    outputQuantityKey: string;
    inputQuantities: string[];
    inputQuantityKeys: string[];
    operation: string;
    expressionAst: CalculationExpression;
    expression: string;
    result: string;
    resultUnit?: string;
    referenceResult?: {
      value: number;
      unit?: string;
    };
    sourceLabels: string[];
  }>;
  calculationPlan: {
    nodes: Array<{
      quantity: string;
      calculationKey: string;
      value: string;
      role: string;
      origin: CalculationValueOrigin;
      unit?: string;
    }>;
    steps: Array<{
      outputQuantity: string;
      outputQuantityKey: string;
      inputQuantities: string[];
      inputQuantityKeys: string[];
      operation: string;
      expressionAst: CalculationExpression;
      expression: string;
      result: string;
      resultUnit?: string;
    }>;
    finalTarget?: string;
    finalTargetKey?: string;
    comparison?: {
      kind: "LOWER_IS_BETTER" | "HIGHER_IS_BETTER";
      label: string;
      candidateOutputKeys: string[];
    };
  };
  presentationRequirements: CalculationPresentationRequirements;
  sourceLabels: string[];
};

export type CalculationPresentationRequirements = {
  showFormula: boolean;
  formula?: {
    expression: string;
    sourceLabels: string[];
  };
  requestedSymbols: Array<{
    symbol: string;
    quantityKey: string;
    meaning: string;
    sourceLabels: string[];
  }>;
  requestedUnits: string[];
};

export type CalculationAnswerViewModel = {
  formula?: {
    expression: string;
    sourceLabels: string[];
  };
  symbolDefinitions: Array<{
    symbol: string;
    quantityKey: string;
    meaning: string;
    sourceLabels: string[];
  }>;
  givenValues: Array<{
    symbol: string;
    quantityKey: string;
    value: string;
    unit?: string;
    sourceLabels: string[];
  }>;
  steps: StructuredCalculationOutput["steps"];
  finalResult: {
    quantity: string;
    result: string;
    unit: string;
    sourceLabels: string[];
  };
};

export type FormulaContract = {
  expressions: string[];
  requiredVariables: Array<{
    symbol: string;
    meaning: string;
    sourceLabels: string[];
  }>;
  requiredConditions: Array<{
    text: string;
    sourceLabels: string[];
  }>;
  requiredUnits: Array<{
    quantity: string;
    unit: string;
    sourceLabels: string[];
  }>;
  sourceLabels: string[];
};

export function selectTaskOutputMode(input: {
  requestRequirements: RequestRequirements;
  answerabilityDecision: AnswerabilityDecision;
}): TaskOutputMode {
  const requirements = flattenRequirements(input.requestRequirements.requirements);
  if (
    requirements.some((requirement) =>
      ["CALCULATION", "MULTI_OPTION_COMPARISON"].includes(requirement.kind)
    ) ||
    requirements.some(
      (requirement) =>
        requirement.kind === "PROCEDURE_METHOD" &&
        (requirement.requestedAction === "WORK_THROUGH" ||
          (requirement.constraints ?? []).includes("worked example"))
    )
  ) {
    return "STRUCTURED_CALCULATION";
  }

  if (requirements.some(requiresFormulaOutput)) {
    return "STRUCTURED_FORMULA";
  }

  return "GENERAL_PROSE";
}

export function buildCalculationContract(
  units: ValidatedEvidenceUnit[],
  options: {
    requestRequirements?: RequestRequirements;
    answerabilityDecision?: AnswerabilityDecision;
    evidenceCapabilities?: EvidenceCapability[];
    requestedFinalQuantity?: string;
  } = {}
): CalculationContract {
  const sourceLabels = uniqueStrings(units.map((unit) => unit.sourceLabel));
  const bindings = uniqueQuantityBindings(
    units.flatMap((unit) =>
      (unit.semanticQuantityBindings ?? []).map((binding) => ({
        ...binding,
        sourceLabels: [unit.sourceLabel],
      }))
    )
  );
  const requestedFinalQuantity =
    options.requestedFinalQuantity ??
    inferRequestedFinalQuantity(options.requestRequirements);
  const origins = inferCalculationValueOrigins(bindings, requestedFinalQuantity);
  const quantities = uniqueBy([
    ...pathInputQuantities(options.answerabilityDecision, options.evidenceCapabilities),
    ...unitRateInputQuantitiesFromEvidenceCapabilities(options.evidenceCapabilities ?? []),
    ...bindings
    .filter((binding) => binding.value !== undefined)
    .map((binding) => ({
      quantity: binding.label || binding.quantityId,
      calculationKey: calculationKeyForBinding(binding),
      value: numberToText(binding.value!),
      role: binding.role ?? "quantityValue",
      origin: originForBinding(binding, origins),
      unit: binding.unit,
      sourceLabels: binding.sourceLabels,
    })),
  ], (quantity) => normalizeCalculationKey(quantity.calculationKey));
  const authorisedMethods = [
    ...deriveCalculationMethodsFromAnswerabilityPaths({
      answerabilityDecision: options.answerabilityDecision,
      evidenceCapabilities: options.evidenceCapabilities,
      units,
    }),
    ...deriveUnitRateCalculationMethodsFromEvidenceCapabilities(
      options.evidenceCapabilities ?? []
    ),
    ...deriveCalculationMethods(bindings, units, {
    origins,
    requestedFinalQuantity,
    }),
  ];
  const dedupedMethods = uniqueBy(authorisedMethods, (method) =>
    `${normalizeCalculationKey(method.outputQuantityKey)}:${renderExpressionSignature(method.expressionAst)}:${method.result}`
  );
  const comparison = inferCalculationComparisonPlan(dedupedMethods, options.requestRequirements);
  const finalTarget = inferFinalTargetFromMethods(
    dedupedMethods,
    requestedFinalQuantity,
    comparison
  );
  const finalTargetKey = finalTarget
    ? dedupedMethods.find(
        (method) =>
          normalizeCalculationKey(method.outputQuantity) ===
          normalizeCalculationKey(finalTarget)
      )?.outputQuantityKey
    : undefined;
  const presentationRequirements = deriveCalculationPresentationRequirements({
    requestRequirements: options.requestRequirements,
    answerabilityDecision: options.answerabilityDecision,
    evidenceCapabilities: options.evidenceCapabilities ?? [],
    authorisedMethods: dedupedMethods,
  });
  return {
    quantities,
    authorisedMethods: dedupedMethods,
    calculationPlan: {
      nodes: quantities.map(({ quantity, calculationKey, value, role, origin, unit }) => ({
        quantity,
        calculationKey,
        value,
        role,
        origin,
        unit,
      })),
      steps: dedupedMethods.map(
        ({ outputQuantity, outputQuantityKey, inputQuantities, inputQuantityKeys, operation, expressionAst, expression, result, resultUnit }) => ({
          outputQuantity,
          outputQuantityKey,
          inputQuantities,
          inputQuantityKeys,
          operation,
          expressionAst,
          expression,
          result,
          resultUnit,
        })
      ),
      finalTarget,
      finalTargetKey,
      comparison,
    },
    presentationRequirements,
    sourceLabels,
  };
}

export function buildFormulaContract(units: ValidatedEvidenceUnit[]): FormulaContract {
  const sourceLabels = uniqueStrings(units.map((unit) => unit.sourceLabel));
  const formulaExpressions = uniqueStrings(
    units.flatMap((unit) =>
      (unit.semanticComponents ?? [])
        .filter((component) => component.kind === "FORMULA" && component.text)
        .map((component) => component.text!)
    )
  ).filter(isFormulaExpressionForContract);
  const requiredUnits = deriveRequiredFormulaUnits(units);
  const requiredVariables = deriveRequiredFormulaVariables(
    units,
    formulaExpressions,
    requiredUnits
  );
  const requiredConditions = uniqueBy(
    units
      .flatMap((unit) =>
        (unit.semanticComponents ?? [])
          .filter((component) => component.kind === "EXPLICIT_FACT" && component.text)
          .map((component) => ({
            text: component.text!,
            sourceLabels: [unit.sourceLabel],
          }))
      )
      .filter((condition) => /right angle|perpendicular/i.test(condition.text)),
    (condition) => normalizeText(condition.text)
  );

  return {
    expressions: formulaExpressions,
    requiredVariables,
    requiredConditions,
    requiredUnits,
    sourceLabels,
  };
}

export function buildStructuredCalculationPrompt(input: {
  question: string;
  subjectName?: string | null;
  topicTitle?: string | null;
  contract: CalculationContract;
}) {
  const system = [
    "You are the WAEC StudyBuddy tutor.",
    "Return only the requested strict JSON object.",
    "Use the supplied calculation contract as a closed world.",
    "Do not invent alternate methods, operands, quantities, or source labels.",
    "Every step must use an authorised semantic quantity role.",
    "Follow the calculationPlan direction only: do not use final/reference results as upstream operands.",
    "Do not add backwards verification steps unless they are explicit authorised plan steps.",
    input.subjectName ? `Subject: ${input.subjectName}` : null,
    input.topicTitle ? `Topic: ${input.topicTitle}` : null,
    `<calculation_contract>\n${JSON.stringify(input.contract, null, 2)}\n</calculation_contract>`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    messages: [
      { role: "system" as const, content: system },
      { role: "user" as const, content: input.question },
    ] satisfies GenerateMessage[],
  };
}

export function buildStructuredFormulaPrompt(input: {
  question: string;
  subjectName?: string | null;
  topicTitle?: string | null;
  contract: FormulaContract;
}) {
  const system = [
    "You are the WAEC StudyBuddy tutor.",
    "Return only the requested strict JSON object.",
    "Use the supplied formula contract as a closed world.",
    "Do not invent conventional symbols or geometric relations that are not in the contract.",
    "Every variable meaning, unit, and condition must use authorised source labels.",
    input.subjectName ? `Subject: ${input.subjectName}` : null,
    input.topicTitle ? `Topic: ${input.topicTitle}` : null,
    `<formula_contract>\n${JSON.stringify(input.contract, null, 2)}\n</formula_contract>`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    messages: [
      { role: "system" as const, content: system },
      { role: "user" as const, content: input.question },
    ] satisfies GenerateMessage[],
  };
}

export function validateStructuredCalculationOutput(input: {
  value: unknown;
  contract: CalculationContract;
  validatedEvidenceUnits: ValidatedEvidenceUnit[];
}): StructuredTaskValidationResult<StructuredCalculationOutput> {
  const parsed = structuredCalculationSchema.safeParse(input.value);
  if (!parsed.success) {
    return fail("INVALID_SCHEMA", "Structured calculation output is invalid.");
  }

  const errors: StructuredTaskValidationError[] = [];
  const allowedLabels = new Set(input.contract.sourceLabels);
  const bindings = uniqueQuantityBindings(
    input.validatedEvidenceUnits.flatMap((unit) =>
      (unit.semanticQuantityBindings ?? []).map((binding) => ({
        ...binding,
        sourceLabels: [unit.sourceLabel],
      }))
    )
  );
  const assigned = new Map<string, number>();
  const derivedValues: Array<{ quantity: string; value: number }> = [];
  const availableQuantities = new Set(
    input.contract.quantities
      .filter((quantity) => quantity.origin === "GIVEN_INPUT")
      .map((quantity) => normalizeQuantity(quantity.calculationKey))
  );

  const checkLabels = (labels: string[], path: string) => {
    for (const label of labels) {
      if (!allowedLabels.has(label)) {
        errors.push({
          code: "UNKNOWN_SOURCE_LABEL",
          message: "Source label is not authorised for this calculation.",
          path,
        });
      }
    }
  };

  parsed.data.steps.forEach((step, index) => {
    checkLabels(step.sourceLabels, `steps.${index}.sourceLabels`);
    const target = normalizeQuantity(step.targetQuantity);
    const targetBindings = bindingsForQuantity(bindings, target);

    const expression = parseNumericExpression(step.expression);
    const result = parseNumber(step.result);
    if (!expression || result === undefined) {
      errors.push({
        code: "UNSUPPORTED_OPERATION",
        message: "Calculation expression/result could not be parsed deterministically.",
        path: `steps.${index}.expression`,
      });
      return;
    }

    const authorisedMethod = findAuthorisedMethodForStep(
      input.contract,
      step.targetQuantity,
      step.expression,
      step.result
    );
    const hasAuthorisedMethod = Boolean(authorisedMethod);
    if (targetBindings.length === 0 && !hasAuthorisedMethod) {
      errors.push({
        code: "UNAUTHORISED_TARGET_QUANTITY",
        message: `Target quantity is not authorised: ${step.targetQuantity}.`,
        path: `steps.${index}.targetQuantity`,
      });
    }

    if (!hasAuthorisedMethod) {
      errors.push({
        code: "UNSUPPORTED_OPERATION",
        message: "Calculation step does not match an authorised method.",
        path: `steps.${index}.expression`,
      });
    }

    if (authorisedMethod) {
      const dependencyErrors = validateStepDependencies({
        method: authorisedMethod,
        availableQuantities,
        path: `steps.${index}`,
      });
      errors.push(...dependencyErrors);
    }

    if (!numbersClose(expression.result, result)) {
      errors.push({
        code: "INCORRECT_RESULT",
        message: "Calculation result does not match the expression.",
        path: `steps.${index}.result`,
      });
    }

    if (
      !operandsSupportedByEvidence({
        operands: expression.operands,
        bindings,
        derivedValues,
        contract: input.contract,
      })
    ) {
      errors.push({
        code: "UNSUPPORTED_OPERAND",
        message: "Calculation operand is not authorised by evidence or prior steps.",
        path: `steps.${index}.expression`,
      });
    }

    errors.push(
      ...validateStepSemanticTarget({
        target,
        operation: expression.operation,
        operands: expression.operands,
        result,
        bindings,
        path: `steps.${index}`,
      })
    );

    const previous = assigned.get(target);
    if (previous !== undefined && !numbersClose(previous, result)) {
      errors.push({
        code: "CONTRADICTORY_ASSIGNMENT",
        message: "The same semantic quantity was assigned incompatible values.",
        path: `steps.${index}.result`,
      });
    }
    assigned.set(target, result);
    if (authorisedMethod) {
      availableQuantities.add(normalizeQuantity(authorisedMethod.outputQuantityKey));
    }
    derivedValues.push({ quantity: target, value: result });
  });

  checkLabels(parsed.data.sourceLabels, "sourceLabels");
  const finalResult = parseNumber(parsed.data.finalResult);
  const finalTarget = normalizeQuantity(parsed.data.finalQuantity);
  if (finalResult === undefined) {
    errors.push({
      code: "INCORRECT_RESULT",
      message: "Final result is not a deterministic number.",
      path: "finalResult",
    });
  } else {
    const previous = assigned.get(finalTarget);
    if (previous !== undefined && !numbersClose(previous, finalResult)) {
      errors.push({
        code: "CONTRADICTORY_ASSIGNMENT",
        message: "Final result contradicts an earlier validated step.",
        path: "finalResult",
      });
    }
    errors.push(
      ...validateQuantityValue({
        quantity: finalTarget,
        value: finalResult,
        bindings,
        path: "finalResult",
      })
    );
    const planFinalTarget = input.contract.calculationPlan.finalTarget;
    if (
      planFinalTarget &&
      normalizeQuantity(planFinalTarget) === finalTarget &&
      previous === undefined
    ) {
      errors.push({
        code: "MISSING_REQUIRED_STEP",
        message: "Final result was not derived through the authorised calculation path.",
        path: "steps",
      });
    }
  }

  return errors.length > 0 ? { supported: false, errors } : {
    supported: true,
    output: parsed.data,
    errors: [],
  };
}

export function validateStructuredFormulaOutput(input: {
  value: unknown;
  contract: FormulaContract;
  validatedEvidenceUnits: ValidatedEvidenceUnit[];
}): StructuredTaskValidationResult<StructuredFormulaOutput> {
  const parsed = structuredFormulaSchema.safeParse(input.value);
  if (!parsed.success) {
    return fail("INVALID_SCHEMA", "Structured formula output is invalid.");
  }

  const errors: StructuredTaskValidationError[] = [];
  const allowedLabels = new Set(input.contract.sourceLabels);
  const checkLabels = (labels: string[], path: string) => {
    for (const label of labels) {
      if (!allowedLabels.has(label)) {
        errors.push({
          code: "UNKNOWN_SOURCE_LABEL",
          message: "Source label is not authorised for this formula.",
          path,
        });
      }
    }
  };

  checkLabels(parsed.data.sourceLabels, "sourceLabels");
  if (!formulaExpressionMatches(parsed.data.expression, input.contract.expressions)) {
    errors.push({
      code: "UNSUPPORTED_EXPRESSION",
      message: "Formula expression does not match authorised evidence.",
      path: "expression",
    });
  }

  const seenVariables = new Set<string>();
  for (const [index, variable] of parsed.data.variables.entries()) {
    checkLabels(variable.sourceLabels, `variables.${index}.sourceLabels`);
    const symbol = normalizeQuantity(variable.symbol);
    if (seenVariables.has(symbol)) {
      errors.push({
        code: "DUPLICATE_VARIABLE",
        message: "Variable was defined more than once.",
        path: `variables.${index}.symbol`,
      });
    }
    seenVariables.add(symbol);

    const expected = input.contract.requiredVariables.find(
      (item) => normalizeQuantity(item.symbol) === symbol
    );
    if (!expected) {
      errors.push({
        code: "UNSUPPORTED_SYMBOL",
        message: "Variable/symbol is not authorised by the selected evidence.",
        path: `variables.${index}.symbol`,
      });
      continue;
    }
    if (!meaningMatches(variable.meaning, expected.meaning)) {
      errors.push({
        code: "INCORRECT_VARIABLE_MEANING",
        message: "Variable meaning does not match authorised evidence.",
        path: `variables.${index}.meaning`,
      });
    }
  }

  for (const required of input.contract.requiredVariables) {
    if (!seenVariables.has(normalizeQuantity(required.symbol))) {
      errors.push({
        code: "MISSING_REQUIRED_VARIABLE",
        message: `Missing required variable definition: ${required.symbol}.`,
      });
    }
  }

  const seenUnits = new Set<string>();
  for (const [index, unit] of parsed.data.units.entries()) {
    checkLabels(unit.sourceLabels, `units.${index}.sourceLabels`);
    const quantity = normalizeQuantity(unit.quantity);
    const expected = input.contract.requiredUnits.find(
      (item) => normalizeQuantity(item.quantity) === quantity
    );
    if (!expected) {
      errors.push({
        code: "UNSUPPORTED_UNIT",
        message: "Unit quantity is not authorised by the selected evidence.",
        path: `units.${index}.quantity`,
      });
      continue;
    }
    if (!unitMatches(unit.unit, expected.unit)) {
      errors.push({
        code: "INCORRECT_UNIT",
        message: "Unit does not match authorised evidence.",
        path: `units.${index}.unit`,
      });
    }
    seenUnits.add(quantity);
  }

  for (const required of input.contract.requiredUnits) {
    if (!seenUnits.has(normalizeQuantity(required.quantity))) {
      errors.push({
        code: "MISSING_REQUIRED_UNIT",
        message: `Missing required unit: ${required.quantity}.`,
      });
    }
  }

  for (const [index, condition] of parsed.data.conditions.entries()) {
    checkLabels(condition.sourceLabels, `conditions.${index}.sourceLabels`);
    if (/opposite\s+vertex/i.test(condition.text) && !contractText(input.contract).includes("opposite vertex")) {
      errors.push({
        code: "UNSUPPORTED_RELATION",
        message: "Condition introduces an unsupported geometric relation/entity.",
        path: `conditions.${index}.text`,
      });
    }
  }

  for (const required of input.contract.requiredConditions) {
    if (
      !parsed.data.conditions.some((condition) =>
        conditionMatches(condition.text, required.text)
      )
    ) {
      errors.push({
        code: "MISSING_REQUIRED_CONDITION",
        message: "Required formula condition was omitted.",
      });
    }
  }

  return errors.length > 0 ? { supported: false, errors } : {
    supported: true,
    output: parsed.data,
    errors: [],
  };
}

export function renderStructuredCalculationAnswer(
  output: StructuredCalculationOutput,
  contract: CalculationContract
): {
  content: string;
  answerSegments: GroundedTeachAnswerSegment[];
  validation: StructuredTaskValidationResult<CalculationAnswerViewModel>;
} {
  const viewModel = buildCalculationAnswerViewModel(output, contract);
  const text = renderCalculationAnswerViewModel(viewModel);
  const validation = validateCalculationAnswerViewModel(viewModel, contract, text);
  const sourceLabels = uniqueStrings(output.sourceLabels);
  return {
    content: renderSegment({ text, sourceLabels }),
    answerSegments: [{ text, sourceLabels }],
    validation,
  };
}

export function buildCalculationAnswerViewModel(
  output: StructuredCalculationOutput,
  contract: CalculationContract
): CalculationAnswerViewModel {
  const presentation = contract.presentationRequirements;
  const formula = presentation.showFormula && presentation.formula
    ? presentation.formula
    : undefined;
  const givenByKey = new Map(
    contract.quantities
      .filter((quantity) => quantity.origin === "GIVEN_INPUT")
      .map((quantity) => [normalizeCalculationKey(quantity.calculationKey), quantity])
  );
  const symbolByQuantityKey = new Map(
    presentation.requestedSymbols.map((symbol) => [
      normalizeCalculationKey(symbol.quantityKey),
      symbol.symbol,
    ])
  );
  const givenValues = presentation.requestedSymbols
    .flatMap((symbol) => {
      const quantity = givenByKey.get(normalizeCalculationKey(symbol.quantityKey));
      if (!quantity) return [];
      return [
        {
          symbol: symbol.symbol,
          quantityKey: symbol.quantityKey,
          value: quantity.value,
          unit: quantity.unit,
          sourceLabels: quantity.sourceLabels,
        },
      ];
    });
  const steps = output.steps.map((step) => ({
    ...step,
    targetQuantity:
      symbolByQuantityKey.get(normalizeCalculationKey(step.targetQuantity)) ??
      step.targetQuantity,
    expression: renderDisplayExpression(step.expression),
  }));

  return {
    formula: formula
      ? {
          ...formula,
          expression: renderDisplayExpression(formula.expression),
        }
      : undefined,
    symbolDefinitions: presentation.requestedSymbols,
    givenValues,
    steps,
    finalResult: {
      quantity: output.finalQuantity,
      result: output.finalResult,
      unit: output.finalUnit,
      sourceLabels: output.sourceLabels,
    },
  };
}

export function validateCalculationAnswerViewModel(
  viewModel: CalculationAnswerViewModel,
  contract: CalculationContract,
  renderedText = renderCalculationAnswerViewModel(viewModel)
): StructuredTaskValidationResult<CalculationAnswerViewModel> {
  const errors: StructuredTaskValidationError[] = [];
  const presentation = contract.presentationRequirements;
  const normalizedRendered = normalizeText(renderedText);

  if (presentation.showFormula && !viewModel.formula?.expression) {
    errors.push({
      code: "MISSING_REQUIRED_STEP",
      message: "Requested calculation formula was omitted.",
      path: "formula",
    });
  }

  for (const requested of presentation.requestedSymbols) {
    const actual = viewModel.symbolDefinitions.find(
      (symbol) => normalizeQuantity(symbol.symbol) === normalizeQuantity(requested.symbol)
    );
    if (!actual) {
      errors.push({
        code: "MISSING_REQUIRED_VARIABLE",
        message: `Missing requested calculation variable: ${requested.symbol}.`,
        path: "symbolDefinitions",
      });
      continue;
    }
    if (
      normalizeQuantity(actual.quantityKey) !== normalizeQuantity(requested.quantityKey) ||
      !meaningMatches(actual.meaning, requested.meaning)
    ) {
      errors.push({
        code: "INCORRECT_VARIABLE_MEANING",
        message: `Incorrect meaning for requested calculation variable: ${requested.symbol}.`,
        path: "symbolDefinitions",
      });
    }
    if (
      !renderedTextHasToken(renderedText, requested.symbol) ||
      !normalizedRendered.includes(normalizeText(requested.meaning))
    ) {
      errors.push({
        code: "MISSING_REQUIRED_VARIABLE",
        message: `Rendered answer omitted the requested calculation variable meaning: ${requested.symbol}.`,
        path: "content",
      });
    }
  }

  for (const requestedUnit of presentation.requestedUnits) {
    const renderedUnits = [
      ...viewModel.givenValues.map((value) => value.unit ?? ""),
      ...viewModel.steps.map((step) => step.unit),
      viewModel.finalResult.unit,
    ];
    if (!renderedUnits.some((unit) => normalizeUnit(unit) === normalizeUnit(requestedUnit))) {
      errors.push({
        code: "MISSING_REQUIRED_UNIT",
        message: `Requested calculation unit was omitted: ${requestedUnit}.`,
        path: "units",
      });
    }
  }

  if (viewModel.steps.length === 0) {
    errors.push({
      code: "MISSING_REQUIRED_STEP",
      message: "Calculation trace was omitted.",
      path: "steps",
    });
  }

  if (!viewModel.finalResult.result) {
    errors.push({
      code: "MISSING_REQUIRED_STEP",
      message: "Final calculation result was omitted.",
      path: "finalResult",
    });
  }

  return errors.length > 0
    ? { supported: false, errors }
    : { supported: true, output: viewModel, errors: [] };
}

function renderCalculationAnswerViewModel(viewModel: CalculationAnswerViewModel) {
  const symbolLine = renderSymbolDefinitionLine(viewModel.symbolDefinitions);
  const formulaLine = viewModel.formula
    ? `The formula is ${viewModel.formula.expression}.`
    : null;
  const givenLines =
    viewModel.givenValues.length > 0
      ? [
          "Here:",
          ...viewModel.givenValues.map(
            (value) => `${value.symbol} = ${value.value}${formatUnit(value.unit ?? "")}`
          ),
        ].join("\n")
      : null;
  const stepLines = viewModel.steps.map(
    (step) =>
      `${step.targetQuantity} = ${step.expression} = ${step.result}${formatUnit(step.unit)}`
  );
  const finalLine = `Therefore, ${viewModel.finalResult.quantity} = ${viewModel.finalResult.result}${formatUnit(viewModel.finalResult.unit)}.`;
  return [symbolLine, formulaLine, givenLines, ...stepLines, finalLine]
    .filter(Boolean)
    .join("\n");
}

function renderSymbolDefinitionLine(
  symbols: CalculationAnswerViewModel["symbolDefinitions"]
) {
  if (symbols.length === 0) return null;
  const parts = symbols.map((symbol) => `${symbol.symbol} means ${symbol.meaning}`);
  if (parts.length === 1) return `${parts[0]}.`;
  if (parts.length === 2) return `${parts[0]}, and ${parts[1]}.`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}.`;
}

function renderDisplayExpression(expression: string) {
  return expression
    .replace(/\s+x\s+/gi, " × ")
    .replace(/\*/g, "×")
    .replace(/\s+/g, " ")
    .trim();
}

export function structuredCalculationOutputFromTrace(
  trace: ValidatedCalculationTrace
): StructuredCalculationOutput {
  const steps = trace.steps.map((step) => ({
    targetQuantity: step.outputQuantity,
    expression: step.renderedExpression,
    result: numberToText(step.result),
    unit: step.unit ?? "",
    sourceLabels: step.sourceLabels,
  }));
  const finalSourceLabels =
    trace.comparisonResult?.sourceLabels ??
    trace.steps.at(-1)?.sourceLabels ??
    trace.sourceLabels;
  return {
    steps,
    finalQuantity: trace.comparisonResult?.label ?? trace.finalTarget,
    finalResult: trace.comparisonResult?.result ?? numberToText(trace.finalResult),
    finalUnit: trace.comparisonResult ? "" : trace.finalUnit ?? "",
    sourceLabels: uniqueStrings(finalSourceLabels),
    suggestedQuestions: [],
  };
}

export function renderStructuredFormulaAnswer(output: StructuredFormulaOutput): {
  content: string;
  answerSegments: GroundedTeachAnswerSegment[];
} {
  const variableLines = output.variables.map(
    (variable) => `- ${variable.symbol} means ${variable.meaning}.`
  );
  const unitLines = output.units.map(
    (unit) => `- ${unit.quantity} is measured in ${unit.unit}.`
  );
  const conditionLines = output.conditions.map((condition) => `- ${condition.text}.`);
  const text = [
    `The formula is ${output.expression}.`,
    variableLines.length > 0 ? variableLines.join("\n") : null,
    unitLines.length > 0 ? unitLines.join("\n") : null,
    conditionLines.length > 0 ? conditionLines.join("\n") : null,
  ]
    .filter(Boolean)
    .join("\n");
  const sourceLabels = uniqueStrings(output.sourceLabels);
  return {
    content: renderSegment({ text, sourceLabels }),
    answerSegments: [{ text, sourceLabels }],
  };
}

export function structuredRepairInstruction(input: {
  mode: TaskOutputMode;
  errors: StructuredTaskValidationError[];
}) {
  const errorCodes = input.errors.map((error) => error.code).join(", ") || "INVALID_OUTPUT";
  const shared = [
    "Repair the previous JSON object by regenerating the full response.",
    `Validation errors: ${errorCodes}.`,
    "Use only the validated evidence and authorised source labels already supplied.",
    "Do not fall back to prose-only output.",
  ];
  if (input.mode === "STRUCTURED_CALCULATION") {
    return [
      ...shared,
      "Fix wrong semantic quantity bindings, unsupported operands, unsupported operations, contradictory assignments, incorrect results, or missing required steps.",
      "Every step target and operand must match its authorised semantic role.",
      "If an error mentions dependencies, remove backwards/circular steps and follow only the calculationPlan direction.",
    ].join(" ");
  }
  return [
    ...shared,
    "Fix missing variable definitions, incorrect meanings, unsupported symbols, missing required units, incorrect units, missing required conditions, or unsupported relations/entities.",
    "Do not invent conventional symbols or relations that are not in the formula contract.",
  ].join(" ");
}

function deriveCalculationPresentationRequirements(input: {
  requestRequirements?: RequestRequirements;
  answerabilityDecision?: AnswerabilityDecision;
  evidenceCapabilities: EvidenceCapability[];
  authorisedMethods: CalculationContract["authorisedMethods"];
}): CalculationPresentationRequirements {
  const requestAsksForVariables = calculationRequestAsksForVariableDefinitions(
    input.requestRequirements
  );
  const selectedFormula = selectedCalculationFormula(input);
  const requestedSymbols =
    requestAsksForVariables && selectedFormula
      ? requestedCalculationSymbols({
          formula: selectedFormula.formula,
          path: selectedFormula.path,
          evidenceCapabilities: input.evidenceCapabilities,
          authorisedMethods: input.authorisedMethods,
        })
      : [];

  return {
    showFormula:
      Boolean(selectedFormula) &&
      (calculationRequestAsksForFormula(input.requestRequirements) ||
        requestedSymbols.length > 0),
    formula: selectedFormula
      ? {
          expression: selectedFormula.formula.expression,
          sourceLabels: [selectedFormula.formula.sourceLabel],
        }
      : undefined,
    requestedSymbols,
    requestedUnits: calculationRequestAsksForUnits(input.requestRequirements)
      ? requestedCalculationUnits(input.answerabilityDecision)
      : [],
  };
}

function calculationRequestAsksForFormula(requestRequirements?: RequestRequirements) {
  if (!requestRequirements) return false;
  const requirements = flattenRequirements(requestRequirements.requirements);
  return (
    /\b(?:formula|equation|law)\b/i.test(requestRequirements.normalizedQuestion) ||
    requirements.some((requirement) =>
      ["FORMULA", "FORMULA_WITH_SYMBOLS"].includes(requirement.kind)
    )
  );
}

function calculationRequestAsksForVariableDefinitions(
  requestRequirements?: RequestRequirements
) {
  if (!requestRequirements) return false;
  const requirements = flattenRequirements(requestRequirements.requirements);
  return (
    /\b(?:define|explain|name|identify|state|list)\b.{0,100}\b(?:variables?|symbols?)\b/i.test(
      requestRequirements.normalizedQuestion
    ) ||
    /\bwhat\s+(?:does|do)\b.{0,80}\b(?:mean|represent|stand\s+for)\b/i.test(
      requestRequirements.normalizedQuestion
    ) ||
    requirements.some(
      (requirement) =>
        requirement.kind === "FORMULA_WITH_SYMBOLS" ||
        requirement.kind === "SYMBOL_DEFINITION" ||
        requirement.requestedAction === "DEFINE_VARIABLES" ||
        /\b(?:variables?|symbols?)\b/i.test(requirement.requestedFact ?? "") ||
        (requirement.requiredSymbols ?? []).length > 0
    )
  );
}

function calculationRequestAsksForUnits(requestRequirements?: RequestRequirements) {
  if (!requestRequirements) return false;
  const requirements = flattenRequirements(requestRequirements.requirements);
  return (
    /\b(?:units?|measured\s+in)\b/i.test(requestRequirements.normalizedQuestion) ||
    requirements.some(
      (requirement) =>
        requirement.requestedFacet === "UNIT" ||
        requirement.requestedAction === "STATE_UNIT"
    )
  );
}

function selectedCalculationFormula(input: {
  answerabilityDecision?: AnswerabilityDecision;
  evidenceCapabilities: EvidenceCapability[];
}) {
  const formulas = formulaCapabilitiesById(input.evidenceCapabilities);
  const completePath = (input.answerabilityDecision?.calculationPaths ?? []).find(
    (path) => path.complete
  );
  const formula = completePath
    ? formulas.get(completePath.formulaCapabilityId)
    : input.evidenceCapabilities.flatMap((capability) => capability.formulas)[0];
  return formula ? { formula, path: completePath } : undefined;
}

function requestedCalculationSymbols(input: {
  formula: EvidenceCapability["formulas"][number];
  path?: NonNullable<AnswerabilityDecision["calculationPaths"]>[number];
  evidenceCapabilities: EvidenceCapability[];
  authorisedMethods: CalculationContract["authorisedMethods"];
}): CalculationPresentationRequirements["requestedSymbols"] {
  const outputQuantity = input.path
    ? calculationOutputQuantityForPath(input.path.outputConcept, input.formula.expression)
    : calculationConceptDisplay(input.formula.outputQuantity ?? "");
  const inputByFormulaSymbol = new Map(
    (input.path?.availableInputs ?? [])
      .map((available) => {
        const symbol = leadingFormulaSymbol(available.text ?? "");
        const quantityKey = available.concept?.baseConcept;
        if (!symbol || !quantityKey || quantityKey.startsWith("concept:")) return undefined;
        return [
          normalizeQuantity(symbol),
          {
            quantityKey,
            meaning: calculationConceptDisplay(quantityKey),
            sourceLabels: uniqueStrings([
              available.sourceLabel,
              ...sourceLabelsForCapability(
                input.evidenceCapabilities,
                available.sourceCapabilityId
              ),
            ].filter((label): label is string => Boolean(label))),
          },
        ] as const;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  );
  const directDefinitions = new Map(
    [
      ...input.formula.symbolDefinitions,
      ...input.evidenceCapabilities.flatMap((capability) => capability.symbolDefinitions),
    ]
      .filter(
        (definition) =>
          definition.meaning &&
          !looksLikeAssignedValue(definition.meaning) &&
          definition.polarity === "POSITIVE"
      )
      .map((definition) => [
        definition.symbol.normalized,
        {
          quantityKey:
            definition.canonicalConcept?.id && !definition.canonicalConcept.id.startsWith("concept:")
              ? definition.canonicalConcept.id
              : normalizeQuantity(definition.meaning ?? definition.symbol.display),
          meaning: definition.meaning!,
          sourceLabels: [definition.sourceLabel],
        },
      ] as const)
  );
  const outputSymbol = normalizeQuantity(input.formula.outputQuantity ?? "");
  const symbols = input.formula.symbols.length > 0
    ? input.formula.symbols
    : extractFormulaTerms(input.formula.expression).map((term) => ({
        display: term,
        normalized: normalizeQuantity(term),
      }));

  const requestedSymbols = uniqueBy(
    symbols.flatMap((symbol) => {
      const normalized = normalizeQuantity(symbol.normalized || symbol.display);
      const inputBinding = inputByFormulaSymbol.get(normalized);
      const direct = directDefinitions.get(normalized);
      const outputBinding =
        outputSymbol &&
        normalized === outputSymbol &&
        outputQuantity &&
        !normalizeQuantity(outputQuantity).startsWith("concept")
          ? {
              quantityKey: outputQuantity,
              meaning: calculationConceptDisplay(outputQuantity),
              sourceLabels: [input.formula.sourceLabel],
            }
          : undefined;
      const resolved = inputBinding ?? outputBinding ?? direct;
      if (!resolved) return [];
      if (!symbol.display || normalizeQuantity(resolved.meaning) === normalized) {
        return [];
      }
      return [
        {
          symbol: symbol.display,
          quantityKey: resolved.quantityKey,
          meaning: resolved.meaning,
          sourceLabels: uniqueStrings([input.formula.sourceLabel, ...resolved.sourceLabels]),
        },
      ];
    }),
    (symbol) => normalizeQuantity(symbol.symbol)
  );
  const normalizedOutputQuantity = normalizeCalculationKey(outputQuantity);
  return requestedSymbols.sort((left, right) => {
    const leftIsOutput =
      normalizeCalculationKey(left.quantityKey) === normalizedOutputQuantity;
    const rightIsOutput =
      normalizeCalculationKey(right.quantityKey) === normalizedOutputQuantity;
    if (leftIsOutput === rightIsOutput) return 0;
    return leftIsOutput ? 1 : -1;
  });
}

function requestedCalculationUnits(
  answerabilityDecision?: AnswerabilityDecision
): string[] {
  return uniqueStrings(
    (answerabilityDecision?.calculationPaths ?? [])
      .flatMap((path) => path.availableInputs)
      .map((input) => input.unit)
      .filter((unit): unit is string => Boolean(unit))
  );
}

function leadingFormulaSymbol(value: string) {
  return value.match(/^\s*(?:and\s+)?([A-Za-z])\s+(?:is|=)\b/i)?.[1];
}

function sourceLabelsForCapability(
  evidenceCapabilities: EvidenceCapability[],
  capabilityId?: string
) {
  if (!capabilityId) return [];
  return evidenceCapabilities.flatMap((capability) =>
    [
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
    ]
      .filter((item) => item.id === capabilityId)
      .map((item) => item.sourceLabel)
  );
}

function looksLikeAssignedValue(value: string) {
  return /^\s*\d+(?:\.\d+)?(?:\s*(?:%|percent|years?|seconds?|met(?:er|re)s?|naira))?\s*$/i.test(
    value
  );
}

function deriveCalculationMethods(
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>,
  units: ValidatedEvidenceUnit[],
  options: {
    origins: Map<string, CalculationValueOrigin>;
    requestedFinalQuantity?: string;
  }
) {
  const methods: CalculationContract["authorisedMethods"] = [];
  const ratioParts = bindings.filter(
    (binding) => binding.role === "ratioPartValue" && binding.value !== undefined
  );
  const onePart = bindings.find(
    (binding) => binding.role === "derivedUnitValue" && binding.value !== undefined
  );
  if (onePart) {
    for (const quantity of bindings.filter(
      (binding) =>
        binding.role === "quantityValue" &&
        binding.value !== undefined &&
        originForBinding(binding, options.origins) === "GIVEN_INPUT"
    )) {
      const part = ratioParts.find(
        (binding) => normalizeQuantity(binding.quantityId) === normalizeQuantity(quantity.quantityId)
      );
      if (!part?.value) continue;
      methods.push(createCalculationMethod({
        targetQuantity: onePart.label,
        outputQuantityKey: calculationKeyForBinding(onePart),
        inputQuantities: [quantity.label, part.label],
        inputQuantityKeys: [
          calculationKeyForBinding(quantity),
          calculationKeyForBinding(part),
        ],
        operation: "/",
        expression: `${numberToText(quantity.value!)} / ${numberToText(part.value)}`,
        result: numberToText(onePart.value!),
        sourceLabels: uniqueStrings([...onePart.sourceLabels, ...quantity.sourceLabels, ...part.sourceLabels]),
      }));
    }
    for (const part of ratioParts) {
      const quantity = bindings.find(
        (binding) =>
          binding.role === "quantityValue" &&
          binding.value !== undefined &&
          normalizeQuantity(binding.quantityId) === normalizeQuantity(part.quantityId) &&
          originForBinding(binding, options.origins) !== "GIVEN_INPUT"
      );
      if (!quantity?.value || !part.value) continue;
      methods.push(createCalculationMethod({
        targetQuantity: quantity.label,
        outputQuantityKey: calculationKeyForBinding(quantity),
        inputQuantities: [part.label, onePart.label],
        inputQuantityKeys: [
          calculationKeyForBinding(part),
          calculationKeyForBinding(onePart),
        ],
        operation: "*",
        expression: `${numberToText(part.value)} * ${numberToText(onePart.value!)}`,
        result: numberToText(quantity.value!),
        sourceLabels: uniqueStrings([...onePart.sourceLabels, ...quantity.sourceLabels, ...part.sourceLabels]),
      }));
    }
  }

  const rate = bindings.find(
    (binding) => binding.role === "rateValue" && binding.value !== undefined
  );
  const original = bindings.find(
    (binding) => binding.role === "originalValue" && binding.value !== undefined
  );
  const discount = bindings.find(
    (binding) => binding.role === "discountValue" && binding.value !== undefined
  );
  const salePrice = bindings.find(
    (binding) => binding.role === "salePriceValue" && binding.value !== undefined
  );
  if (rate?.value !== undefined && original?.value !== undefined && discount?.value !== undefined) {
    methods.push(createCalculationMethod({
      targetQuantity: discount.label,
      outputQuantityKey: calculationKeyForBinding(discount),
      inputQuantities: [rate.label, original.label],
      inputQuantityKeys: [
        calculationKeyForBinding(rate),
        calculationKeyForBinding(original),
      ],
      operation: "*",
      expressionAst: binaryExpression(
        "MULTIPLY",
        binaryExpression(
          "DIVIDE",
          valueExpression(calculationKeyForBinding(rate)),
          constantExpression(100)
        ),
        valueExpression(calculationKeyForBinding(original))
      ),
      expression: `${numberToText(rate.value)} / 100 * ${numberToText(original.value)}`,
      result: numberToText(discount.value),
      sourceLabels: uniqueStrings([
        ...rate.sourceLabels,
        ...original.sourceLabels,
        ...discount.sourceLabels,
      ]),
    }));
  }
  if (original?.value !== undefined && discount?.value !== undefined && salePrice?.value !== undefined) {
    methods.push(createCalculationMethod({
      targetQuantity: salePrice.label,
      outputQuantityKey: calculationKeyForBinding(salePrice),
      inputQuantities: [original.label, discount.label],
      inputQuantityKeys: [
        calculationKeyForBinding(original),
        calculationKeyForBinding(discount),
      ],
      operation: "-",
      expression: `${numberToText(original.value)} - ${numberToText(discount.value)}`,
      result: numberToText(salePrice.value),
      sourceLabels: uniqueStrings([
        ...original.sourceLabels,
        ...discount.sourceLabels,
        ...salePrice.sourceLabels,
      ]),
    }));
  }
  methods.push(...deriveSimpleInterestCalculationMethods(bindings));
  methods.push(...deriveUnitRateCalculationMethods(bindings));
  methods.push(...deriveSpeedCalculationMethods(bindings, options.requestedFinalQuantity));
  methods.push(...deriveFormulaCalculationMethods(bindings, units));

  return uniqueBy(methods, (method) =>
    `${normalizeQuantity(method.targetQuantity)}:${method.expression}:${method.result}`
  );
}

function createCalculationMethod(input: {
  targetQuantity: string;
  outputQuantityKey?: string;
  inputQuantities: string[];
  inputQuantityKeys?: string[];
  operation: string;
  expressionAst?: CalculationExpression;
  expression: string;
  result: string;
  resultUnit?: string;
  referenceResult?: {
    value: number;
    unit?: string;
  };
  sourceLabels: string[];
}): CalculationContract["authorisedMethods"][number] {
  const inputQuantityKeys = input.inputQuantityKeys ?? input.inputQuantities;
  return {
    targetQuantity: input.targetQuantity,
    outputQuantity: input.targetQuantity,
    outputQuantityKey: input.outputQuantityKey ?? input.targetQuantity,
    inputQuantities: input.inputQuantities,
    inputQuantityKeys,
    operation: input.operation,
    expressionAst:
      input.expressionAst ??
      buildOperationExpression(input.operation, inputQuantityKeys),
    expression: input.expression,
    result: input.result,
    resultUnit: input.resultUnit,
    referenceResult: input.referenceResult,
    sourceLabels: input.sourceLabels,
  };
}

function buildOperationExpression(
  operation: string,
  inputQuantityKeys: string[]
): CalculationExpression {
  const [left, right] = inputQuantityKeys;
  if (!left || !right) {
    return valueExpression(left ?? "missing-input");
  }
  const leftExpression = valueExpression(left);
  const rightExpression = valueExpression(right);
  switch (operation) {
    case "+":
      return binaryExpression("ADD", leftExpression, rightExpression);
    case "-":
      return binaryExpression("SUBTRACT", leftExpression, rightExpression);
    case "*":
      return binaryExpression("MULTIPLY", leftExpression, rightExpression);
    case "/":
      return binaryExpression("DIVIDE", leftExpression, rightExpression);
    default:
      return valueExpression(left);
  }
}

function pathInputQuantities(
  answerabilityDecision: AnswerabilityDecision | undefined,
  evidenceCapabilities: EvidenceCapability[] | undefined
): CalculationContract["quantities"] {
  const sourceLabelsByCapabilityId = sourceLabelsByCapability(evidenceCapabilities ?? []);
  return uniqueBy(
    (answerabilityDecision?.calculationPaths ?? [])
      .filter((path) => path.complete)
      .flatMap((path) =>
        path.availableInputs.map((input) => {
          const conceptKey = input.concept?.baseConcept ?? normalizeQuantity(input.text ?? "");
          return {
            quantity: calculationConceptDisplay(conceptKey),
            calculationKey: conceptKey,
            value: numberToText(input.value ?? NaN),
            role: `${conceptKey}Value`,
            origin: "GIVEN_INPUT" as const,
            unit: input.unit,
            sourceLabels: uniqueStrings([
              input.sourceLabel,
              ...(input.sourceCapabilityId
                ? sourceLabelsByCapabilityId.get(input.sourceCapabilityId) ?? []
                : []),
            ].filter((label): label is string => Boolean(label))),
          };
        })
      )
      .filter((quantity) => Number.isFinite(Number(quantity.value))),
    (quantity) => quantity.calculationKey
  );
}

function deriveCalculationMethodsFromAnswerabilityPaths(input: {
  answerabilityDecision?: AnswerabilityDecision;
  evidenceCapabilities?: EvidenceCapability[];
  units: ValidatedEvidenceUnit[];
}): CalculationContract["authorisedMethods"] {
  const completePaths = (input.answerabilityDecision?.calculationPaths ?? []).filter(
    (path) => path.complete
  );
  if (completePaths.length === 0) return [];
  const formulas = formulaCapabilitiesById(input.evidenceCapabilities ?? []);
  const sourceTexts = (input.evidenceCapabilities ?? [])
    .map((capability) => capability.sourceContent ?? "")
    .filter(Boolean);

  return completePaths.flatMap((path) => {
    const formula = formulas.get(path.formulaCapabilityId);
    const formulaText =
      formula?.expression ??
      input.units
        .flatMap((unit) => unit.semanticComponents ?? [])
        .find(
          (component) =>
            component.kind === "FORMULA" &&
            component.sourceCapabilityId === path.formulaCapabilityId
        )?.text;
    if (!formulaText) return [];

    const outputQuantity = calculationOutputQuantityForPath(path.outputConcept, formulaText);
    const outputKey = normalizeQuantity(outputQuantity);
    const values = new Map<string, number>();
    const sourceLabels = uniqueStrings([
      formula?.sourceLabel,
      ...path.availableInputs.map((input) => input.sourceLabel),
    ].filter((label): label is string => Boolean(label)));
    for (const available of path.availableInputs) {
      const conceptKey = available.concept?.baseConcept ?? normalizeQuantity(available.text ?? "");
      if (available.value !== undefined) {
        values.set(conceptKey, available.value);
      }
    }

    const expressionAst = parseFormulaExpressionForPath({
      formulaText,
      outputConcept: path.outputConcept,
      availableInputKeys: [...values.keys()],
    });
    if (!expressionAst) return [];
    const result = evaluateExpressionForContract(expressionAst, values);
    if (result === undefined) return [];
    const referenceResult = findReferenceResult({
      outputQuantity,
      formulaText,
      sourceTexts,
    });

    return [
      createCalculationMethod({
        targetQuantity: outputQuantity,
        outputQuantityKey: outputKey,
        inputQuantities: path.availableInputs.map((input) =>
          calculationConceptDisplay(input.concept?.baseConcept ?? input.text ?? "")
        ),
        inputQuantityKeys: path.availableInputs.map((input) =>
          input.concept?.baseConcept ?? normalizeQuantity(input.text ?? "")
        ),
        operation: operationForExpression(expressionAst),
        expressionAst,
        expression: renderFormulaExpressionTemplate(expressionAst, values),
        result: numberToText(result),
        resultUnit: inferResultUnit({
          outputQuantity,
          inputUnits: path.availableInputs.map((input) => input.unit),
        }),
        referenceResult,
        sourceLabels,
      }),
    ];
  });
}

function deriveSimpleInterestCalculationMethods(
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>
): CalculationContract["authorisedMethods"] {
  const principal = findBindingByRole(bindings, "principalValue");
  const rate = findBindingByRole(bindings, "rateValue");
  const time = findBindingByRole(bindings, "timeValue");
  const interest = findBindingByRole(bindings, "interestValue");
  const total = bindings.find(
    (binding) =>
      binding.value !== undefined &&
      /^(?:total|final|amount|total amount|final amount|new value)$/i.test(
        normalizeQuantity(binding.label)
      )
  );
  const methods: CalculationContract["authorisedMethods"] = [];
  if (
    principal?.value !== undefined &&
    rate?.value !== undefined &&
    time?.value !== undefined &&
    interest?.value !== undefined
  ) {
    methods.push(createCalculationMethod({
      targetQuantity: interest.label,
      outputQuantityKey: calculationKeyForBinding(interest),
      inputQuantities: [principal.label, rate.label, time.label],
      inputQuantityKeys: [
        calculationKeyForBinding(principal),
        calculationKeyForBinding(rate),
        calculationKeyForBinding(time),
      ],
      operation: "*",
      expressionAst: binaryExpression(
        "DIVIDE",
        binaryExpression(
          "MULTIPLY",
          binaryExpression(
            "MULTIPLY",
            valueExpression(calculationKeyForBinding(principal)),
            valueExpression(calculationKeyForBinding(rate))
          ),
          valueExpression(calculationKeyForBinding(time))
        ),
        constantExpression(100)
      ),
      expression: `${numberToText(principal.value)} * ${numberToText(rate.value)} * ${numberToText(time.value)} / 100`,
      result: numberToText(interest.value),
      sourceLabels: uniqueStrings([
        ...principal.sourceLabels,
        ...rate.sourceLabels,
        ...time.sourceLabels,
        ...interest.sourceLabels,
      ]),
    }));
  }
  if (principal?.value !== undefined && interest?.value !== undefined && total?.value !== undefined) {
    methods.push(createCalculationMethod({
      targetQuantity: total.label,
      outputQuantityKey: calculationKeyForBinding(total),
      inputQuantities: [principal.label, interest.label],
      inputQuantityKeys: [
        calculationKeyForBinding(principal),
        calculationKeyForBinding(interest),
      ],
      operation: "+",
      expression: `${numberToText(principal.value)} + ${numberToText(interest.value)}`,
      result: numberToText(total.value),
      sourceLabels: uniqueStrings([
        ...principal.sourceLabels,
        ...interest.sourceLabels,
        ...total.sourceLabels,
      ]),
    }));
  }
  return methods;
}

function deriveUnitRateCalculationMethods(
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>
): CalculationContract["authorisedMethods"] {
  const groups = groupUnitRateBindings(bindings);
  const methods: CalculationContract["authorisedMethods"] = [];
  for (const group of groups) {
    const price = group.price;
    const quantity = group.quantity;
    const rate = group.rate;
    if (price?.value === undefined || quantity?.value === undefined || quantity.value === 0) {
      continue;
    }
    const result = rate?.value ?? price.value / quantity.value;
    const rateLabel = rate?.label ?? `${group.optionLabel ? `${group.optionLabel} ` : ""}unit rate`;
    const rateKey = rate ? calculationKeyForBinding(rate) : normalizeCalculationKey(rateLabel);
    methods.push(
      createCalculationMethod({
        targetQuantity: rateLabel,
        outputQuantityKey: rateKey,
        inputQuantities: [price.label, quantity.label],
        inputQuantityKeys: [
          calculationKeyForBinding(price),
          calculationKeyForBinding(quantity),
        ],
        operation: "/",
        expression: `${numberToText(price.value)} / ${numberToText(quantity.value)}`,
        result: numberToText(result),
        resultUnit: unitRateUnit(price.unit, quantity.unit),
        sourceLabels: uniqueStrings([
          ...price.sourceLabels,
          ...quantity.sourceLabels,
          ...(rate?.sourceLabels ?? []),
        ]),
      })
    );
  }
  return methods;
}

function deriveUnitRateCalculationMethodsFromEvidenceCapabilities(
  evidenceCapabilities: EvidenceCapability[]
): CalculationContract["authorisedMethods"] {
  const bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }> =
    [];
  for (const capability of evidenceCapabilities) {
    for (const numeric of capability.numericValues) {
      const option = normalizeCalculationKey(numeric.qualifier ?? "");
      if (!option) continue;
      if (numeric.role === "PRICE") {
        bindings.push({
          quantityId: `${option} total cost`,
          label: `${numeric.qualifier} total cost`,
          value: numeric.value,
          unit: numeric.unit,
          role: "priceValue",
          sourceLabels: [numeric.sourceLabel],
          sourceCapabilityIds: [numeric.id],
        });
      }
      if (numeric.role === "QUANTITY") {
        bindings.push({
          quantityId: `${option} bottle count`,
          label: `${numeric.qualifier} bottle count`,
          value: numeric.value,
          unit: numeric.unit,
          role: "quantityCount",
          sourceLabels: [numeric.sourceLabel],
          sourceCapabilityIds: [numeric.id],
        });
      }
    }
  }
  return deriveUnitRateCalculationMethods(bindings);
}

function unitRateInputQuantitiesFromEvidenceCapabilities(
  evidenceCapabilities: EvidenceCapability[]
): CalculationContract["quantities"] {
  return evidenceCapabilities.flatMap((capability) =>
    capability.numericValues.flatMap((numeric) => {
      const option = normalizeCalculationKey(numeric.qualifier ?? "");
      if (!option || !["PRICE", "QUANTITY"].includes(numeric.role ?? "")) return [];
      const optionLabel = numeric.qualifier ?? option;
      const isPrice = numeric.role === "PRICE";
      return [
        {
          quantity: isPrice
            ? `${optionLabel} total cost`
            : `${optionLabel} bottle count`,
          calculationKey: isPrice
            ? `${option} total cost`
            : `${option} bottle count`,
          value: numberToText(numeric.value),
          role: isPrice ? "priceValue" : "quantityCount",
          origin: "GIVEN_INPUT" as const,
          unit: numeric.unit,
          sourceLabels: [numeric.sourceLabel],
        },
      ];
    })
  );
}

function groupUnitRateBindings(
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>
) {
  const groups = new Map<
    string,
    {
      optionLabel: string;
      price?: SemanticQuantityBinding & { sourceLabels: string[] };
      quantity?: SemanticQuantityBinding & { sourceLabels: string[] };
      rate?: SemanticQuantityBinding & { sourceLabels: string[] };
    }
  >();
  for (const binding of bindings) {
    if (!["priceValue", "quantityCount", "unitRateValue"].includes(binding.role ?? "")) {
      continue;
    }
    const option = unitRateOptionKey(binding);
    const group = groups.get(option.key) ?? { optionLabel: option.label };
    if (binding.role === "priceValue") group.price = binding;
    if (binding.role === "quantityCount") group.quantity = binding;
    if (binding.role === "unitRateValue") group.rate = binding;
    groups.set(option.key, group);
  }
  return [...groups.values()].sort((left, right) =>
    left.optionLabel.localeCompare(right.optionLabel)
  );
}

function unitRateOptionKey(binding: SemanticQuantityBinding) {
  const label = `${binding.label} ${binding.quantityId}`;
  const match = label.match(/\b((?:crate|option|pack|plan|shop|bundle|ticket)\s+[A-Za-z0-9]+)\b/i);
  const optionLabel = match?.[1] ?? "default";
  return {
    key: normalizeCalculationKey(optionLabel),
    label: optionLabel === "default" ? "" : optionLabel,
  };
}

function deriveSpeedCalculationMethods(
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>,
  requestedFinalQuantity?: string
): CalculationContract["authorisedMethods"] {
  const distance = findBindingByRole(bindings, "distanceValue");
  const time = findBindingByRole(bindings, "timeValue");
  const speed = findBindingByRole(bindings, "speedValue");
  const requested = normalizeQuantity(requestedFinalQuantity ?? "speed");
  const methods: CalculationContract["authorisedMethods"] = [];
  if (
    distance?.value !== undefined &&
    time?.value !== undefined &&
    speed?.value !== undefined &&
    (!requested || requested === normalizeQuantity(speed.label))
  ) {
    methods.push(createCalculationMethod({
      targetQuantity: speed.label,
      outputQuantityKey: calculationKeyForBinding(speed),
      inputQuantities: [distance.label, time.label],
      inputQuantityKeys: [
        calculationKeyForBinding(distance),
        calculationKeyForBinding(time),
      ],
      operation: "/",
      expression: `${numberToText(distance.value)} / ${numberToText(time.value)}`,
      result: numberToText(speed.value),
      sourceLabels: uniqueStrings([
        ...distance.sourceLabels,
        ...time.sourceLabels,
        ...speed.sourceLabels,
      ]),
    }));
  }
  if (
    distance?.value !== undefined &&
    time?.value !== undefined &&
    speed?.value !== undefined &&
    requested === normalizeQuantity(distance.label)
  ) {
    methods.push(createCalculationMethod({
      targetQuantity: distance.label,
      outputQuantityKey: calculationKeyForBinding(distance),
      inputQuantities: [speed.label, time.label],
      inputQuantityKeys: [
        calculationKeyForBinding(speed),
        calculationKeyForBinding(time),
      ],
      operation: "*",
      expression: `${numberToText(speed.value)} * ${numberToText(time.value)}`,
      result: numberToText(distance.value),
      sourceLabels: uniqueStrings([
        ...speed.sourceLabels,
        ...time.sourceLabels,
        ...distance.sourceLabels,
      ]),
    }));
  }
  return methods;
}

function deriveFormulaCalculationMethods(
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>,
  units: ValidatedEvidenceUnit[]
): CalculationContract["authorisedMethods"] {
  const methods: CalculationContract["authorisedMethods"] = [];
  const formulaExpressions = units.flatMap((unit) =>
    (unit.semanticComponents ?? [])
      .filter((component) => component.kind === "FORMULA" && component.text?.includes("="))
      .map((component) => ({ expression: component.text!, sourceLabels: [unit.sourceLabel] }))
  );

  for (const formula of formulaExpressions) {
    const parsed = parseBinaryFormulaExpression(formula.expression);
    if (!parsed) continue;
    const leftInput = findCalculationBinding(parsed.leftInput, bindings);
    const rightInput = findCalculationBinding(parsed.rightInput, bindings);
    if (leftInput?.value === undefined || rightInput?.value === undefined) continue;

    const expression = `${numberToText(leftInput.value)} ${parsed.operator} ${numberToText(rightInput.value)}`;
    const result = evaluateArithmetic(expression);
    if (result === undefined) continue;
    methods.push(createCalculationMethod({
      targetQuantity: parsed.targetQuantity,
      outputQuantityKey: parsed.targetQuantity,
      inputQuantities: [leftInput.label, rightInput.label],
      inputQuantityKeys: [
        calculationKeyForBinding(leftInput),
        calculationKeyForBinding(rightInput),
      ],
      operation: parsed.operator,
      expression,
      result: numberToText(result),
      sourceLabels: uniqueStrings([
        ...formula.sourceLabels,
        ...leftInput.sourceLabels,
        ...rightInput.sourceLabels,
      ]),
    }));
  }

  return methods;
}

function inferCalculationValueOrigins(
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>,
  requestedFinalQuantity?: string
) {
  const origins = new Map<string, CalculationValueOrigin>();
  const firstDerivedIndex = bindings.findIndex(
    (binding) => binding.role === "derivedUnitValue" && binding.value !== undefined
  );
  const ratioQuantityIds = new Set(
    bindings
      .filter((binding) => binding.role === "ratioPartValue")
      .map((binding) => normalizeQuantity(binding.quantityId))
  );
  const requested = normalizeQuantity(requestedFinalQuantity ?? "");
  for (const [index, binding] of bindings.entries()) {
    const key = bindingKey(binding);
    const role = binding.role ?? "quantityValue";
    const quantity = normalizeQuantity(binding.label || binding.quantityId);
    let origin: CalculationValueOrigin;
    if (
      [
        "ratioPartValue",
        "rateValue",
        "originalValue",
        "principalValue",
        "timeValue",
        "distanceValue",
        "priceValue",
        "quantityCount",
      ].includes(role)
    ) {
      origin = "GIVEN_INPUT";
    } else if (role === "derivedUnitValue" || role === "discountValue" || role === "interestValue" || role === "unitRateValue") {
      origin = "DERIVED_INTERMEDIATE";
    } else if (role === "salePriceValue" || role === "newValue" || role === "totalAmountValue") {
      origin = "FINAL_RESULT";
    } else if (requested && quantity === requested) {
      origin = "FINAL_RESULT";
    } else if (
      role === "quantityValue" &&
      ratioQuantityIds.has(normalizeQuantity(binding.quantityId)) &&
      firstDerivedIndex >= 0
    ) {
      origin = index < firstDerivedIndex ? "GIVEN_INPUT" : "REFERENCE_RESULT";
    } else {
      origin = "GIVEN_INPUT";
    }
    origins.set(key, origin);
  }
  return origins;
}

function originForBinding(
  binding: SemanticQuantityBinding,
  origins: Map<string, CalculationValueOrigin>
) {
  return origins.get(bindingKey(binding)) ?? "GIVEN_INPUT";
}

function bindingKey(binding: SemanticQuantityBinding) {
  return [
    normalizeQuantity(binding.quantityId),
    normalizeQuantity(binding.label),
    binding.role ?? "",
    binding.value ?? "",
  ].join(":");
}

function findBindingByRole(
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>,
  role: string
) {
  return bindings.find(
    (binding) => binding.role === role && binding.value !== undefined
  );
}

function inferRequestedFinalQuantity(requestRequirements?: RequestRequirements) {
  if (!requestRequirements) return undefined;
  const requirements = flattenRequirements(requestRequirements.requirements);
  const candidate = requirements
    .map((requirement) => requirement.requestedFact ?? "")
    .find((value) => value && /\b(?:speed|distance|time|interest|amount|price|discount|girls|boys)\b/i.test(value));
  if (!candidate) return undefined;
  if (/\bdistance\b/i.test(candidate)) return "distance";
  if (/\bspeed|velocity\b/i.test(candidate)) return "speed";
  if (/\btime\b/i.test(candidate)) return "time";
  if (/\binterest\b/i.test(candidate)) return "interest";
  if (/\bamount|total\b/i.test(candidate)) return "total amount";
  if (/\bprice\b/i.test(candidate)) return "sale price";
  if (/\bdiscount\b/i.test(candidate)) return "discount";
  if (/\bgirls\b/i.test(candidate)) return "girls";
  if (/\bboys\b/i.test(candidate)) return "boys";
  return undefined;
}

function inferFinalTargetFromMethods(
  methods: CalculationContract["authorisedMethods"],
  requestedFinalQuantity?: string,
  comparison?: CalculationContract["calculationPlan"]["comparison"]
) {
  void comparison;
  const requested = normalizeQuantity(requestedFinalQuantity ?? "");
  if (requested) {
    const match = methods.find(
      (method) => normalizeQuantity(method.outputQuantity) === requested
    );
    if (match) return match.outputQuantity;
  }
  return methods.at(-1)?.outputQuantity;
}

function inferCalculationComparisonPlan(
  methods: CalculationContract["authorisedMethods"],
  requestRequirements?: RequestRequirements
): CalculationContract["calculationPlan"]["comparison"] | undefined {
  const requirements = requestRequirements
    ? flattenRequirements(requestRequirements.requirements)
    : [];
  if (!requirements.some((requirement) => requirement.kind === "MULTI_OPTION_COMPARISON")) {
    return undefined;
  }
  const unitRateMethods = methods.filter((method) =>
    /\bunit\s+rate|cost\s+per\s+(?:bottle|item|unit)|per\s+(?:bottle|item|unit)\b/i.test(
      `${method.outputQuantity} ${method.resultUnit ?? ""}`
    )
  );
  if (unitRateMethods.length < 2) return undefined;
  return {
    kind: "LOWER_IS_BETTER",
    label: "better value",
    candidateOutputKeys: unitRateMethods.map((method) => method.outputQuantityKey),
  };
}

function formulaCapabilitiesById(evidenceCapabilities: EvidenceCapability[]) {
  return new Map(
    evidenceCapabilities
      .flatMap((capability) => capability.formulas)
      .map((formula) => [formula.id, formula] as const)
  );
}

function sourceLabelsByCapability(evidenceCapabilities: EvidenceCapability[]) {
  return new Map(
    evidenceCapabilities
      .flatMap((capability) => [
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
      ])
      .map((capability) => [capability.id, [capability.sourceLabel]] as const)
  );
}

function calculationOutputQuantityForPath(outputConcept: string, formulaText: string) {
  const normalizedOutput = normalizeQuantity(outputConcept);
  if (normalizedOutput === "simple interest") return "interest";
  const left = formulaText.split("=")[0]?.trim();
  if (left) {
    const mapped = formulaTermToQuantityKey(left, normalizedOutput, []);
    if (mapped && !mapped.startsWith("concept ")) return calculationConceptDisplay(mapped);
  }
  return calculationConceptDisplay(normalizedOutput);
}

function parseFormulaExpressionForPath(input: {
  formulaText: string;
  outputConcept: string;
  availableInputKeys: string[];
}): CalculationExpression | undefined {
  const [, ...rightParts] = input.formulaText.split("=");
  const right = rightParts.join("=");
  if (!right.trim()) return undefined;
  const tokens = tokenizeFormulaRightSide(right);
  if (tokens.length === 0) return undefined;
  let index = 0;

  const parseFactor = (): CalculationExpression | undefined => {
    const token = tokens[index++];
    if (!token) return undefined;
    if (token === "(") {
      const nested = parseExpression();
      if (tokens[index++] !== ")") return undefined;
      return nested;
    }
    if (/^-?\d+(?:\.\d+)?$/.test(token)) {
      return constantExpression(Number(token));
    }
    const mapped = formulaTermToQuantityKey(
      token,
      input.outputConcept,
      input.availableInputKeys
    );
    return mapped ? valueExpression(mapped) : undefined;
  };

  const parseTerm = (): CalculationExpression | undefined => {
    let expression = parseFactor();
    while (expression && (tokens[index] === "*" || tokens[index] === "/")) {
      const operator = tokens[index++];
      const rightExpression = parseFactor();
      if (!rightExpression) return undefined;
      expression = binaryExpression(
        operator === "*" ? "MULTIPLY" : "DIVIDE",
        expression,
        rightExpression
      );
    }
    return expression;
  };

  const parseExpression = (): CalculationExpression | undefined => {
    let expression = parseTerm();
    while (expression && (tokens[index] === "+" || tokens[index] === "-")) {
      const operator = tokens[index++];
      const rightExpression = parseTerm();
      if (!rightExpression) return undefined;
      expression = binaryExpression(
        operator === "+" ? "ADD" : "SUBTRACT",
        expression,
        rightExpression
      );
    }
    return expression;
  };

  const expression = parseExpression();
  return expression && index === tokens.length ? expression : undefined;
}

function tokenizeFormulaRightSide(value: string) {
  return value
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\btimes\b/gi, "*")
    .replace(/\bmultiplied\s+by\b/gi, "*")
    .replace(/\bdivided\s+by\b/gi, "/")
    .replace(/\bover\b/gi, "/")
    .replace(/\bplus\b/gi, "+")
    .replace(/\bminus\b/gi, "-")
    .replace(/\s+x\s+/gi, " * ")
    .match(/-?\d+(?:\.\d+)?|[A-Za-z][A-Za-z-]*|[()+*/-]/g) ?? [];
}

function formulaTermToQuantityKey(
  term: string,
  outputConcept: string,
  availableInputKeys: string[]
) {
  const normalized = normalizeQuantity(term);
  const output = normalizeQuantity(outputConcept);
  const symbolMap: Record<string, string> = {
    p: "principal",
    r: "rate",
    t: "time",
    i: output === "simple interest" ? "interest" : "current",
    d: "distance",
    s: "speed",
  };
  const mapped = symbolMap[normalized] ?? normalized;
  if (availableInputKeys.map(normalizeQuantity).includes(mapped)) return mapped;
  if (["principal", "rate", "time", "distance", "speed"].includes(mapped)) {
    return mapped;
  }
  return mapped;
}

function evaluateExpressionForContract(
  expression: CalculationExpression,
  values: Map<string, number>
): number | undefined {
  switch (expression.kind) {
    case "VALUE":
      return values.get(normalizeQuantity(expression.quantityKey));
    case "CONSTANT":
      return Number.isFinite(expression.value) ? expression.value : undefined;
    case "ADD":
    case "SUBTRACT":
    case "MULTIPLY":
    case "DIVIDE": {
      const left = evaluateExpressionForContract(expression.left, values);
      const right = evaluateExpressionForContract(expression.right, values);
      if (left === undefined || right === undefined) return undefined;
      if (expression.kind === "DIVIDE" && numbersClose(right, 0)) return undefined;
      const result =
        expression.kind === "ADD"
          ? left + right
          : expression.kind === "SUBTRACT"
            ? left - right
            : expression.kind === "MULTIPLY"
              ? left * right
              : left / right;
      return Number.isFinite(result) ? result : undefined;
    }
  }
}

function renderFormulaExpressionTemplate(
  expression: CalculationExpression,
  values: Map<string, number>
): string {
  switch (expression.kind) {
    case "VALUE":
      return numberToText(values.get(normalizeQuantity(expression.quantityKey)) ?? NaN);
    case "CONSTANT":
      return numberToText(expression.value);
    case "ADD":
      return `${renderFormulaExpressionTemplate(expression.left, values)} + ${renderFormulaExpressionTemplate(expression.right, values)}`;
    case "SUBTRACT":
      return `${renderFormulaExpressionTemplate(expression.left, values)} - ${renderFormulaExpressionTemplate(expression.right, values)}`;
    case "MULTIPLY":
      return `${renderFormulaExpressionTemplate(expression.left, values)} * ${renderFormulaExpressionTemplate(expression.right, values)}`;
    case "DIVIDE":
      return `${renderFormulaExpressionTemplate(expression.left, values)} / ${renderFormulaExpressionTemplate(expression.right, values)}`;
  }
}

function operationForExpression(expression: CalculationExpression): string {
  switch (expression.kind) {
    case "ADD":
      return "+";
    case "SUBTRACT":
      return "-";
    case "MULTIPLY":
      return "*";
    case "DIVIDE":
      return "/";
    default:
      return "value";
  }
}

function renderExpressionSignature(expression: CalculationExpression): string {
  switch (expression.kind) {
    case "VALUE":
      return `value:${normalizeCalculationKey(expression.quantityKey)}`;
    case "CONSTANT":
      return `constant:${numberToText(expression.value)}`;
    case "ADD":
    case "SUBTRACT":
    case "MULTIPLY":
    case "DIVIDE":
      return `${expression.kind}(${renderExpressionSignature(expression.left)},${renderExpressionSignature(expression.right)})`;
  }
}

function inferResultUnit(input: {
  outputQuantity: string;
  inputUnits: Array<string | undefined>;
}) {
  const output = normalizeQuantity(input.outputQuantity);
  if (output === "speed") {
    const [distanceUnit, timeUnit] = input.inputUnits;
    if (distanceUnit && timeUnit) return `${distanceUnit}/${timeUnit}`;
  }
  return undefined;
}

function unitRateUnit(priceUnit: string | undefined, quantityUnit: string | undefined) {
  if (priceUnit && quantityUnit) return `${priceUnit} per ${quantityUnit.replace(/s$/, "")}`;
  if (priceUnit) return `${priceUnit} per unit`;
  return undefined;
}

function findReferenceResult(input: {
  outputQuantity: string;
  formulaText: string;
  sourceTexts: string[];
}) {
  const outputTokens = uniqueStrings([
    input.outputQuantity,
    input.formulaText.split("=")[0]?.trim() ?? "",
  ]).map(escapeRegExp);
  for (const sourceText of input.sourceTexts) {
    for (const outputToken of outputTokens) {
      const pattern = new RegExp(
        `\\b${outputToken}\\b\\s*=\\s*[^.;]*=\\s*([-+]?\\d+(?:\\.\\d+)?)(?:\\s*([A-Za-z/%²³]+))?`,
        "i"
      );
      const match = sourceText.match(pattern);
      const value = Number(match?.[1]);
      if (Number.isFinite(value)) {
        return {
          value,
          unit: match?.[2],
        };
      }
    }
  }
  return undefined;
}

function calculationConceptDisplay(value: string) {
  const normalized = normalizeQuantity(value);
  const labels: Record<string, string> = {
    "simple interest": "interest",
    "original value": "original value",
  };
  return labels[normalized] ?? normalized.replace(/\b\w/g, (char) => char.toLowerCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function deriveRequiredFormulaVariables(
  units: ValidatedEvidenceUnit[],
  formulaExpressions: string[],
  requiredUnits: FormulaContract["requiredUnits"] = []
): FormulaContract["requiredVariables"] {
  const sourceLabels = uniqueStrings(units.map((unit) => unit.sourceLabel));
  const combinedEvidence = units.map((unit) => unit.quotedEvidence).join(" ");
  const termMeanings = deriveFormulaTermMeanings(
    formulaExpressions,
    combinedEvidence,
    requiredUnits
  );
  const explicitSymbols = units.flatMap((unit) =>
    !unit.allowedUses.includes("SYMBOL")
      ? []
      :
    (unit.semanticComponents ?? [])
      .filter((component) => component.kind === "SYMBOL" && component.symbol)
      .map((component) => ({
        symbol: component.symbol!,
        meaning:
          termMeanings.get(normalizeQuantity(component.symbol!)) ??
          component.concept?.aliases?.[0] ??
          component.text?.replace(component.symbol!, "").trim() ??
          component.symbol!,
        sourceLabels: [unit.sourceLabel],
      }))
  );
  const expressionTerms = uniqueStrings(
    formulaExpressions.flatMap(extractFormulaTerms)
  ).filter((term) => !["area"].includes(normalizeQuantity(term)));
  const inferred = expressionTerms.map((term) => ({
    symbol: term,
    meaning:
      termMeanings.get(normalizeQuantity(term)) ??
      inferFormulaTermMeaning(term, combinedEvidence),
    sourceLabels,
  })).filter((item) => {
    const symbol = normalizeQuantity(item.symbol);
    const meaning = normalizeQuantity(item.meaning);
    return symbol.length > 1 || meaning !== symbol;
  });

  return uniqueBy(
    [...explicitSymbols, ...inferred].filter(
      (item) => item.symbol && item.meaning && !/^(?:area)$/i.test(item.symbol)
    ),
    (item) => normalizeQuantity(item.symbol)
  );
}

function deriveRequiredFormulaUnits(
  units: ValidatedEvidenceUnit[]
): FormulaContract["requiredUnits"] {
  return uniqueBy(
    units.flatMap((unit) =>
      (unit.semanticComponents ?? [])
        .filter((component) => component.kind === "UNIT" && component.text)
        .flatMap((component) =>
          extractUnitMappings(component.text!).map((mapping) => {
            const quantity =
              normalizeQuantity(mapping.quantity) === "measured"
                ? component.concept?.aliases?.[0] ?? mapping.quantity
                : mapping.quantity;
            return {
              ...mapping,
              quantity,
              sourceLabels: [unit.sourceLabel],
            };
          })
        )
    ),
    (unit) => `${normalizeQuantity(unit.quantity)}:${normalizeUnit(unit.unit)}`
  );
}

function extractFormulaTerms(expression: string) {
  return expression
    .replace(/\bone\s+half\b/gi, " ")
    .replace(/\bpi\b/gi, " ")
    .replace(/[0-9/*+\-.()×÷]/g, " ")
    .replace(/=/g, " ")
    .split(/\s+/)
    .map((term) => normalizeQuantity(term))
    .filter(
      (term) =>
        term &&
        !["x", "times", "one", "half", "perpendicular"].includes(term)
    );
}

function deriveFormulaTermMeanings(
  formulaExpressions: string[],
  evidence: string,
  requiredUnits: FormulaContract["requiredUnits"] = []
) {
  const result = new Map<string, string>();
  const expressionTerms = new Set(
    formulaExpressions.flatMap(extractFormulaTerms).map(normalizeQuantity)
  );
  for (const match of evidence.matchAll(
    /\b([A-Za-z])\s+(?:is|means|represents)\s+([A-Za-z][A-Za-z\s-]{1,60})(?=,|\.|\band\b|$)/gi
  )) {
    const symbol = normalizeQuantity(match[1] ?? "");
    const meaning = cleanMeaningPhrase(match[2] ?? "");
    if (symbol && meaning && expressionTerms.has(symbol)) {
      result.set(symbol, meaning);
    }
  }
  for (const expression of formulaExpressions) {
    const parsed = parseBinaryFormulaExpression(expression);
    if (!parsed) continue;
    if (requiredUnits.length >= 3) {
      const [target, left, right] = requiredUnits;
      if (target?.quantity) {
        result.set(normalizeQuantity(parsed.targetQuantity), target.quantity);
      }
      if (left?.quantity) {
        result.set(normalizeQuantity(parsed.leftInput), left.quantity);
      }
      if (right?.quantity) {
        result.set(normalizeQuantity(parsed.rightInput), right.quantity);
      }
    }
    const index = evidence.toLowerCase().indexOf(expression.toLowerCase());
    if (index < 0) continue;
    const prefix = evidence.slice(Math.max(0, index - 180), index);
    const afterThat = prefix.match(
      /\bthat\s+([A-Za-z][A-Za-z\s-]{1,80})\s+equals\s+([A-Za-z][A-Za-z\s-]{1,80})\s+(?:times|multiplied by|x)\s+([A-Za-z][A-Za-z\s-]{1,80})\s*:?$/i
    );
    if (afterThat) {
      const target = cleanMeaningPhrase(afterThat[1] ?? "");
      const left = cleanMeaningPhrase(afterThat[2] ?? "");
      const right = cleanMeaningPhrase(afterThat[3] ?? "");
      if (target) result.set(normalizeQuantity(parsed.targetQuantity), target);
      if (left) result.set(normalizeQuantity(parsed.leftInput), left);
      if (right) result.set(normalizeQuantity(parsed.rightInput), right);
      continue;
    }
    const relationMatches = [
      ...prefix.matchAll(
        /(?:^|[.;:]\s*|\bthat\s+)([A-Za-z][A-Za-z\s-]{1,80})\s+equals\s+([A-Za-z][A-Za-z\s-]{1,80})\s+(?:times|multiplied by|x)\s+([A-Za-z][A-Za-z\s-]{1,80})\s*:?$/gi
      ),
    ];
    const relation = relationMatches.at(-1);
    if (!relation) continue;
    const target = cleanMeaningPhrase(relation[1] ?? "");
    const left = cleanMeaningPhrase(relation[2] ?? "");
    const right = cleanMeaningPhrase(relation[3] ?? "");
    if (target) result.set(normalizeQuantity(parsed.targetQuantity), target);
    if (left) result.set(normalizeQuantity(parsed.leftInput), left);
    if (right) result.set(normalizeQuantity(parsed.rightInput), right);
  }
  return result;
}

function cleanMeaningPhrase(value: string) {
  return normalizeText(value)
    .replace(/\b(?:and|states?|that|formula|law)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractUnitMappings(text: string) {
  const mappings: Array<{ quantity: string; unit: string }> = [];
  const unitPattern =
    /(?:^|[,.]\s*|\band\s+)([A-Za-z][A-Za-z\s-]{1,60}?)\s+(?:is\s+)?(?:measured\s+)?in\s+([A-Za-zΩΩµμ][A-Za-zΩΩµμ-]*)/gi;
  for (const match of text.matchAll(unitPattern)) {
    const quantity = cleanMeaningPhrase(match[1] ?? "");
    const unit = normalizeUnitDisplay(match[2] ?? "");
    if (quantity && unit) {
      mappings.push({ quantity, unit });
    }
  }
  return mappings;
}

function parseBinaryFormulaExpression(expression: string) {
  const cleaned = expression.replace(/×/g, "x").replace(/÷/g, "/");
  const match = cleaned.match(
    /^\s*([A-Za-z][A-Za-z\s-]{0,40}|[A-Za-z])\s*=\s*([A-Za-z][A-Za-z\s-]{0,40}|[A-Za-z])\s*(\/|\*|x|\+|-|times|divided by|over)\s*([A-Za-z][A-Za-z\s-]{0,40}|[A-Za-z])\s*$/i
  );
  if (!match) return undefined;
  const operator = normalizeFormulaOperator(match[3] ?? "");
  if (!operator) return undefined;
  return {
    targetQuantity: cleanFormulaTerm(match[1] ?? ""),
    leftInput: cleanFormulaTerm(match[2] ?? ""),
    operator,
    rightInput: cleanFormulaTerm(match[4] ?? ""),
  };
}

function normalizeFormulaOperator(operator: string) {
  const normalized = operator.trim().toLowerCase();
  if (normalized === "x" || normalized === "*" || normalized === "times") return "*";
  if (normalized === "/" || normalized === "divided by" || normalized === "over") return "/";
  if (normalized === "+") return "+";
  if (normalized === "-") return "-";
  return undefined;
}

function cleanFormulaTerm(value: string) {
  return normalizeQuantity(value);
}

function findCalculationBinding(
  term: string,
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>
) {
  const normalized = normalizeQuantity(term);
  return bindings.find(
    (binding) =>
      normalizeQuantity(binding.quantityId) === normalized ||
      normalizeQuantity(binding.label) === normalized
  );
}

function isFormulaExpressionForContract(value: string) {
  if (!value.includes("=")) return false;
  const [left, ...rightParts] = value.split("=");
  const right = rightParts.join("=");
  if (!left?.trim() || !right.trim()) return false;
  return /[0-9*/×x÷()]|\b(?:times|over|divided|multiplied)\b/i.test(right);
}

function inferFormulaTermMeaning(term: string, evidence: string) {
  const normalized = normalizeQuantity(term);
  if (normalized === "height" && /perpendicular\s+height|right\s+angle/i.test(evidence)) {
    return "perpendicular height";
  }
  return normalized;
}

function validateStepSemanticTarget(input: {
  target: string;
  operation: string;
  operands: number[];
  result: number;
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>;
  path: string;
}) {
  const errors: StructuredTaskValidationError[] = [];
  errors.push(
    ...validateQuantityValue({
      quantity: input.target,
      value: input.result,
      bindings: input.bindings,
      path: `${input.path}.result`,
    })
  );

  const targetBindings = bindingsForQuantity(input.bindings, input.target);
  const targetRatioPart = targetBindings.find(
    (binding) => binding.role === "ratioPartValue" && binding.value !== undefined
  );
  if (input.operation === "*" && targetRatioPart) {
    if (!input.operands.some((operand) => numbersClose(operand, targetRatioPart.value!))) {
      errors.push({
        code: "WRONG_SEMANTIC_BINDING",
        message: "Multiplication used the wrong ratio part for the target quantity.",
        path: `${input.path}.expression`,
      });
    }
  }

  const targetDerivedUnit = targetBindings.find(
    (binding) => binding.role === "derivedUnitValue" && binding.value !== undefined
  );
  if (input.operation === "/" && targetDerivedUnit) {
    const [left, right] = input.operands;
    const numeratorQuantities = input.bindings.filter(
      (binding) =>
        binding.role === "quantityValue" &&
        binding.value !== undefined &&
        numbersClose(binding.value, left)
    );
    const denominatorQuantities = input.bindings.filter(
      (binding) =>
        binding.role === "ratioPartValue" &&
        binding.value !== undefined &&
        numbersClose(binding.value, right)
    );
    const linked = numeratorQuantities.some((numerator) =>
      denominatorQuantities.some(
        (denominator) =>
          normalizeQuantity(numerator.quantityId) ===
          normalizeQuantity(denominator.quantityId)
      )
    );
    if (!linked) {
      errors.push({
        code: "WRONG_SEMANTIC_BINDING",
        message: "Division used a denominator that does not belong to the numerator quantity.",
        path: `${input.path}.expression`,
      });
    }
  }

  return errors;
}

function validateQuantityValue(input: {
  quantity: string;
  value: number;
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>;
  path: string;
}) {
  const targetBindings = bindingsForQuantity(input.bindings, input.quantity).filter(
    (binding) => binding.value !== undefined && binding.role !== "ratioPartValue"
  );
  if (
    targetBindings.length > 0 &&
    !targetBindings.some((binding) => numbersClose(binding.value!, input.value))
  ) {
    return [
      {
        code: "WRONG_SEMANTIC_BINDING" as const,
        message: "Result is incompatible with the authorised target quantity.",
        path: input.path,
      },
    ];
  }
  return [];
}

function operandsSupportedByEvidence(input: {
  operands: number[];
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>;
  derivedValues: Array<{ quantity: string; value: number }>;
  contract: CalculationContract;
}) {
  const inputValues = input.contract.quantities
    .filter((quantity) => quantity.origin === "GIVEN_INPUT")
    .map((quantity) => parseNumber(quantity.value))
    .filter((value): value is number => value !== undefined);
  const arithmeticConstants = [0, 1, 100];
  return input.operands.every((operand) =>
    inputValues.some((value) => numbersClose(value, operand)) ||
    input.derivedValues.some((derived) => numbersClose(derived.value, operand)) ||
    arithmeticConstants.some((value) => numbersClose(value, operand))
  );
}

function parseNumericExpression(expression: string) {
  const normalized = expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\bof\b/gi, "*")
    .replace(/,/g, "")
    .replace(/%/g, " / 100 ");
  if (!/^[0-9+\-*/().\s]+$/.test(normalized)) return undefined;
  const operands = [...normalized.matchAll(/[-+]?\d+(?:\.\d+)?/g)].map((match) =>
    Number(match[0])
  );
  if (operands.length < 2 || operands.some((value) => !Number.isFinite(value))) {
    return undefined;
  }
  const operation = normalized.includes("/") ? "/" : normalized.includes("*") ? "*" : normalized.includes("-") ? "-" : "+";
  const result = evaluateArithmetic(normalized);
  if (result === undefined) return undefined;
  return { operands, operation, result };
}

function evaluateArithmetic(expression: string) {
  const tokens = expression.match(/[-+]?\d+(?:\.\d+)?|[+*/()-]/g);
  if (!tokens || tokens.length === 0) return undefined;
  let index = 0;
  const parseFactor = (): number | undefined => {
    const token = tokens[index++];
    if (token === "(") {
      const value = parseExpression();
      if (tokens[index++] !== ")") return undefined;
      return value;
    }
    const numeric = Number(token);
    return Number.isFinite(numeric) ? numeric : undefined;
  };
  const parseTerm = (): number | undefined => {
    let value = parseFactor();
    while (value !== undefined && (tokens[index] === "*" || tokens[index] === "/")) {
      const operator = tokens[index++];
      const right = parseFactor();
      if (right === undefined) return undefined;
      value = operator === "*" ? value * right : right === 0 ? undefined : value / right;
    }
    return value;
  };
  const parseExpression = (): number | undefined => {
    let value = parseTerm();
    while (value !== undefined && (tokens[index] === "+" || tokens[index] === "-")) {
      const operator = tokens[index++];
      const right = parseTerm();
      if (right === undefined) return undefined;
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  const value = parseExpression();
  return value !== undefined && index === tokens.length ? value : undefined;
}

function formulaExpressionMatches(expression: string, authorised: string[]) {
  const normalized = normalizeFormulaExpression(expression);
  return authorised.some(
    (item) => normalizeFormulaExpression(item) === normalized ||
      normalizeFormulaExpression(item).replace(/\bheight\b/g, "perpendicularheight") === normalized.replace(/\bheight\b/g, "perpendicularheight")
  );
}

function findAuthorisedMethodForStep(
  contract: CalculationContract,
  targetQuantity: string,
  expression: string,
  result: string
) {
  return contract.authorisedMethods.find((method) => {
    if (normalizeQuantity(method.targetQuantity) !== normalizeQuantity(targetQuantity)) {
      return false;
    }
    if (!numbersClose(Number(method.result), Number(result))) return false;
    return expressionsEquivalent(method.expression, expression);
  });
}

function validateStepDependencies(input: {
  method: CalculationContract["authorisedMethods"][number];
  availableQuantities: Set<string>;
  path: string;
}) {
  const errors: StructuredTaskValidationError[] = [];
  const output = normalizeQuantity(input.method.outputQuantityKey);
  const normalizedInputs = input.method.inputQuantityKeys.map(normalizeQuantity);
  if (normalizedInputs.includes(output)) {
    errors.push({
      code: "CIRCULAR_DEPENDENCY",
      message: "Calculation step uses its own output as an input.",
      path: `${input.path}.expression`,
    });
  }
  for (const quantity of normalizedInputs) {
    if (!input.availableQuantities.has(quantity)) {
      errors.push({
        code: "UNAUTHORISED_DEPENDENCY",
        message: "Calculation step uses a value before it is available in the authorised derivation.",
        path: `${input.path}.expression`,
      });
    }
  }
  return errors;
}

function expressionsEquivalent(left: string, right: string) {
  const leftParsed = parseNumericExpression(left);
  const rightParsed = parseNumericExpression(right);
  if (!leftParsed || !rightParsed) return normalizeFormulaExpression(left) === normalizeFormulaExpression(right);
  if (!numbersClose(leftParsed.result, rightParsed.result)) return false;
  if (leftParsed.operation === "*" && rightParsed.operation === "*") {
    return sameNumberSet(leftParsed.operands, rightParsed.operands);
  }
  return normalizeNumericExpression(left) === normalizeNumericExpression(right);
}

function normalizeNumericExpression(expression: string) {
  return expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\s+/g, "")
    .trim();
}

function sameNumberSet(left: number[], right: number[]) {
  if (left.length !== right.length) return false;
  const remaining = [...right];
  for (const value of left) {
    const index = remaining.findIndex((candidate) => numbersClose(candidate, value));
    if (index < 0) return false;
    remaining.splice(index, 1);
  }
  return true;
}

function normalizeFormulaExpression(value: string) {
  return value
    .toLowerCase()
    .replace(/area\s+of\s+a\s+triangle\s+is\s+/g, "area=")
    .replace(/\bone\s+half\b/g, "1/2")
    .replace(/\bperpendicular\s+height\b/g, "height")
    .replace(/×/g, "*")
    .replace(/\s*x\s*/g, "*")
    .replace(/[^a-z0-9=/*+\-.]/g, "")
    .trim();
}

function meaningMatches(actual: string, expected: string) {
  const actualText = normalizeText(actual);
  const expectedText = normalizeText(expected);
  if (expectedText === "perpendicular height") {
    return actualText.includes("perpendicular") && actualText.includes("height");
  }
  return actualText.includes(expectedText);
}

function conditionMatches(actual: string, expected: string) {
  const actualText = normalizeText(actual);
  const expectedText = normalizeText(expected);
  if (/right angle|perpendicular/i.test(expected)) {
    return actualText.includes("right angle") || actualText.includes("perpendicular");
  }
  return expectedText
    .split(" ")
    .filter((token) => token.length > 2)
    .every((token) => actualText.includes(token));
}

function unitMatches(actual: string, expected: string) {
  const actualText = normalizeUnit(actual);
  const expectedText = normalizeUnit(expected);
  return actualText === expectedText || actualText.includes(expectedText);
}

function bindingsForQuantity(
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>,
  quantity: string
) {
  const normalized = normalizeQuantity(quantity);
  return bindings.filter(
    (binding) =>
      normalizeQuantity(binding.quantityId) === normalized ||
      normalizeQuantity(binding.label) === normalized
  );
}

function calculationKeyForBinding(binding: SemanticQuantityBinding) {
  const label = binding.label || binding.quantityId;
  switch (binding.role) {
    case "ratioPartValue":
      return `${label} ratio part`;
    case "quantityValue":
      return `${label} count`;
    case "derivedUnitValue":
      return label;
    case "rateValue":
      return /rate/i.test(label) ? label : `${label} rate`;
    case "originalValue":
      return label;
    case "discountValue":
      return label;
    case "salePriceValue":
    case "newValue":
      return label;
    case "principalValue":
      return label;
    case "timeValue":
      return label;
    case "distanceValue":
      return label;
    case "speedValue":
      return label;
    case "interestValue":
      return label;
    case "unitRateValue":
      return label;
    case "priceValue":
      return label;
    case "quantityCount":
      return label;
    default:
      return label;
  }
}

function renderSegment(input: GroundedTeachAnswerSegment) {
  return `${input.text} ${uniqueStrings(input.sourceLabels).map((label) => `[${label}]`).join(" ")}`.trim();
}

function renderedTextHasToken(text: string, token: string) {
  const escaped = escapeRegExp(token);
  return new RegExp(`(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)`, "i").test(text);
}

function formatUnit(unit: string) {
  return unit ? ` ${unit}` : "";
}

function parseNumber(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function numberToText(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(/0+$/, "").replace(/\.$/, "");
}

function numbersClose(left: number, right: number) {
  return Math.abs(left - right) <= 0.01;
}

function normalizeQuantity(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9.%/]+/g, " ")
    .replace(/\b(?:the|a|an|value|number|amount|of|for|as|is|are|equals?|parts?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCalculationKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9.%/]+/g, " ")
    .replace(/\b(?:the|value|number|amount|of|for|as|is|are|equals?|parts?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9.%/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUnit(value: string) {
  return normalizeText(value)
    .replace(/\bohms\b/g, "ohm")
    .replace(/\bvolts\b/g, "volt")
    .replace(/\bamperes\b/g, "ampere")
    .replace(/\bamps\b/g, "ampere")
    .replace(/\bnewtons\b/g, "newton")
    .replace(/\bmetres\b/g, "metre")
    .replace(/\bmeters\b/g, "meter")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUnitDisplay(value: string) {
  return value.trim().replace(/Ω/g, "Ω").replace(/μ/g, "µ");
}

function contractText(contract: FormulaContract) {
  return normalizeText(
    [
      ...contract.expressions,
      ...contract.requiredVariables.map((item) => item.meaning),
      ...contract.requiredUnits.map((item) => `${item.quantity} ${item.unit}`),
      ...contract.requiredConditions.map((item) => item.text),
    ].join(" ")
  );
}

function flattenRequirements(requirements: RequestRequirement[]): RequestRequirement[] {
  return requirements.flatMap((requirement) => [
    requirement,
    ...flattenRequirements(requirement.childRequirements ?? []),
  ]);
}

function requiresFormulaOutput(requirement: RequestRequirement) {
  return (
    requirement.kind === "FORMULA" ||
    requirement.kind === "FORMULA_WITH_SYMBOLS" ||
    requirement.kind === "SYMBOL_DEFINITION" ||
    requirement.requestedFacet === "FORMULA" ||
    (requirement.requiredSemanticComponents ?? []).some(
      (component) => component.kind === "FORMULA"
    )
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const id = key(value);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(value);
  }
  return result;
}

function uniqueQuantityBindings(
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>
) {
  return uniqueBy(
    bindings,
    (binding) =>
      `${normalizeQuantity(binding.quantityId)}:${binding.role ?? ""}:${binding.value ?? ""}:${binding.unit ?? ""}`
  );
}

function fail<T>(
  code: StructuredTaskValidationErrorCode,
  message: string
): StructuredTaskValidationResult<T> {
  return { supported: false, errors: [{ code, message }] };
}
