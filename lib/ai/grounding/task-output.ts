import { z } from "zod";
import type { GenerateMessage, StructuredOutputSchema } from "@/lib/ai/chat/types";
import type { AnswerabilityDecision } from "./answerability/types";
import type {
  SemanticQuantityBinding,
  ValidatedEvidenceUnit,
} from "./evidence-units/validated-evidence-unit";
import type { RequestRequirement, RequestRequirements } from "./requirements/types";
import type { GroundedTeachAnswerSegment } from "./structured-output";

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
  | "MISSING_REQUIRED_VARIABLE"
  | "DUPLICATE_VARIABLE"
  | "UNSUPPORTED_SYMBOL"
  | "INCORRECT_VARIABLE_MEANING"
  | "MISSING_REQUIRED_CONDITION"
  | "UNSUPPORTED_RELATION"
  | "UNSUPPORTED_EXPRESSION";

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

export type CalculationContract = {
  quantities: Array<{
    quantity: string;
    value: string;
    role: string;
    sourceLabels: string[];
  }>;
  authorisedMethods: Array<{
    targetQuantity: string;
    expression: string;
    result: string;
    sourceLabels: string[];
  }>;
  sourceLabels: string[];
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

  if (
    requirements.some((requirement) =>
      ["FORMULA_WITH_SYMBOLS", "SYMBOL_DEFINITION"].includes(requirement.kind)
    ) ||
    (requirements.some((requirement) => requirement.kind === "FORMULA") &&
      requirements.some(
        (requirement) =>
          requirement.requestedAction === "DEFINE_VARIABLES" ||
          /\bvariables?|symbols?\b/i.test(requirement.requestedFact ?? "")
      ))
  ) {
    return "STRUCTURED_FORMULA";
  }

  return "GENERAL_PROSE";
}

export function buildCalculationContract(
  units: ValidatedEvidenceUnit[]
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
  const quantities = bindings
    .filter((binding) => binding.value !== undefined)
    .map((binding) => ({
      quantity: binding.label || binding.quantityId,
      value: numberToText(binding.value!),
      role: binding.role ?? "quantityValue",
      sourceLabels: binding.sourceLabels,
    }));
  return {
    quantities,
    authorisedMethods: deriveCalculationMethods(bindings, units),
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
  const requiredVariables = deriveRequiredFormulaVariables(units, formulaExpressions);
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
    "Every variable meaning and condition must use authorised source labels.",
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

    const hasAuthorisedMethod = authorisedMethodMatchesStep(
      input.contract,
      step.targetQuantity,
      step.expression,
      step.result
    );
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
} {
  const quantitySummary = renderQuantitySummary(contract);
  const stepLines = output.steps.map(
    (step) =>
      `${step.targetQuantity} = ${step.expression} = ${step.result}${formatUnit(step.unit)}`
  );
  const finalLine = `Therefore, ${output.finalQuantity} = ${output.finalResult}${formatUnit(output.finalUnit)}.`;
  const text = [quantitySummary, ...stepLines, finalLine].filter(Boolean).join("\n");
  const sourceLabels = uniqueStrings(output.sourceLabels);
  return {
    content: renderSegment({ text, sourceLabels }),
    answerSegments: [{ text, sourceLabels }],
  };
}

export function renderStructuredFormulaAnswer(output: StructuredFormulaOutput): {
  content: string;
  answerSegments: GroundedTeachAnswerSegment[];
} {
  const variableLines = output.variables.map(
    (variable) => `- ${variable.symbol} means ${variable.meaning}.`
  );
  const conditionLines = output.conditions.map((condition) => `- ${condition.text}.`);
  const text = [
    `The formula is ${output.expression}.`,
    variableLines.length > 0 ? variableLines.join("\n") : null,
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
    ].join(" ");
  }
  return [
    ...shared,
    "Fix missing variable definitions, incorrect meanings, unsupported symbols, missing required conditions, or unsupported relations/entities.",
    "Do not invent conventional symbols or relations that are not in the formula contract.",
  ].join(" ");
}

function deriveCalculationMethods(
  bindings: Array<SemanticQuantityBinding & { sourceLabels: string[] }>,
  units: ValidatedEvidenceUnit[]
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
      (binding) => binding.role === "quantityValue" && binding.value !== undefined
    )) {
      const part = ratioParts.find(
        (binding) => normalizeQuantity(binding.quantityId) === normalizeQuantity(quantity.quantityId)
      );
      if (!part?.value) continue;
      methods.push({
        targetQuantity: onePart.label,
        expression: `${numberToText(quantity.value!)} / ${numberToText(part.value)}`,
        result: numberToText(onePart.value!),
        sourceLabels: uniqueStrings([...onePart.sourceLabels, ...quantity.sourceLabels, ...part.sourceLabels]),
      });
      methods.push({
        targetQuantity: quantity.label,
        expression: `${numberToText(part.value)} * ${numberToText(onePart.value!)}`,
        result: numberToText(quantity.value!),
        sourceLabels: uniqueStrings([...onePart.sourceLabels, ...quantity.sourceLabels, ...part.sourceLabels]),
      });
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
    methods.push({
      targetQuantity: discount.label,
      expression: `${numberToText(rate.value)} / 100 * ${numberToText(original.value)}`,
      result: numberToText(discount.value),
      sourceLabels: uniqueStrings([
        ...rate.sourceLabels,
        ...original.sourceLabels,
        ...discount.sourceLabels,
      ]),
    });
  }
  if (original?.value !== undefined && discount?.value !== undefined && salePrice?.value !== undefined) {
    methods.push({
      targetQuantity: salePrice.label,
      expression: `${numberToText(original.value)} - ${numberToText(discount.value)}`,
      result: numberToText(salePrice.value),
      sourceLabels: uniqueStrings([
        ...original.sourceLabels,
        ...discount.sourceLabels,
        ...salePrice.sourceLabels,
      ]),
    });
  }
  methods.push(...deriveFormulaCalculationMethods(bindings, units));

  return uniqueBy(methods, (method) =>
    `${normalizeQuantity(method.targetQuantity)}:${method.expression}:${method.result}`
  );
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
    methods.push({
      targetQuantity: parsed.targetQuantity,
      expression,
      result: numberToText(result),
      sourceLabels: uniqueStrings([
        ...formula.sourceLabels,
        ...leftInput.sourceLabels,
        ...rightInput.sourceLabels,
      ]),
    });
  }

  return methods;
}

function deriveRequiredFormulaVariables(
  units: ValidatedEvidenceUnit[],
  formulaExpressions: string[]
): FormulaContract["requiredVariables"] {
  const sourceLabels = uniqueStrings(units.map((unit) => unit.sourceLabel));
  const combinedEvidence = units.map((unit) => unit.quotedEvidence).join(" ");
  const explicitSymbols = units.flatMap((unit) =>
    !unit.allowedUses.includes("SYMBOL")
      ? []
      :
    (unit.semanticComponents ?? [])
      .filter((component) => component.kind === "SYMBOL" && component.symbol)
      .map((component) => ({
        symbol: component.symbol!,
        meaning:
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
    meaning: inferFormulaTermMeaning(term, combinedEvidence),
    sourceLabels,
  }));

  return uniqueBy(
    [...explicitSymbols, ...inferred].filter(
      (item) => item.symbol && item.meaning && !/^(?:area)$/i.test(item.symbol)
    ),
    (item) => normalizeQuantity(item.symbol)
  );
}

function extractFormulaTerms(expression: string) {
  const rightSide = expression.includes("=") ? expression.split("=").slice(1).join("=") : expression;
  return rightSide
    .replace(/\bone\s+half\b/gi, " ")
    .replace(/\bpi\b/gi, " ")
    .replace(/[0-9=/*+\-.()×÷]/g, " ")
    .split(/\s+/)
    .map((term) => normalizeQuantity(term))
    .filter(
      (term) =>
        term &&
        !["x", "times", "one", "half", "perpendicular"].includes(term)
    );
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
}) {
  return input.operands.every((operand) =>
    input.bindings.some(
      (binding) => binding.value !== undefined && numbersClose(binding.value, operand)
    ) || input.derivedValues.some((derived) => numbersClose(derived.value, operand))
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

function authorisedMethodMatchesStep(
  contract: CalculationContract,
  targetQuantity: string,
  expression: string,
  result: string
) {
  return contract.authorisedMethods.some((method) => {
    if (normalizeQuantity(method.targetQuantity) !== normalizeQuantity(targetQuantity)) {
      return false;
    }
    if (!numbersClose(Number(method.result), Number(result))) return false;
    return expressionsEquivalent(method.expression, expression);
  });
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

function renderQuantitySummary(contract: CalculationContract) {
  const ratioParts = contract.quantities.filter((quantity) => quantity.role === "ratioPartValue");
  if (ratioParts.length >= 2) {
    return `${ratioParts.map((quantity) => `${quantity.quantity} ratio part = ${quantity.value}`).join("; ")}.`;
  }
  return "";
}

function renderSegment(input: GroundedTeachAnswerSegment) {
  return `${input.text} ${uniqueStrings(input.sourceLabels).map((label) => `[${label}]`).join(" ")}`.trim();
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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9.%/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contractText(contract: FormulaContract) {
  return normalizeText(
    [
      ...contract.expressions,
      ...contract.requiredVariables.map((item) => item.meaning),
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
