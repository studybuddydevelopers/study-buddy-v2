import type { CalculationContract } from "../task-output";
import type {
  CalculationExecutionResult,
  CalculationExpression,
  CalculationPlanFailureReason,
  ValidatedCalculationStep,
} from "./types";

const EPSILON = 1e-9;

export function executeCalculationPlan(
  contract: CalculationContract
): CalculationExecutionResult {
  const validation = validateCalculationPlan(contract);
  if (validation.length > 0) {
    return {
      ok: false,
      failure: {
        code: "INCOMPLETE_CALCULATION_PLAN",
        reasons: validation,
      },
    };
  }

  const values = new Map<string, number>();
  const units = new Map<string, string | undefined>();
  const produced = new Set<string>();
  for (const node of contract.calculationPlan.nodes) {
    if (node.origin !== "GIVEN_INPUT") continue;
    const numeric = parseNumericValue(node.value);
    if (numeric === undefined) continue;
    values.set(normalizeKey(node.calculationKey), numeric);
    units.set(normalizeKey(node.calculationKey), node.unit);
  }

  const steps: ValidatedCalculationStep[] = [];
  const reasons: CalculationPlanFailureReason[] = [];
  for (const method of contract.authorisedMethods) {
    const outputKey = normalizeKey(method.outputQuantityKey);
    const inputKeys = method.inputQuantityKeys.map(normalizeKey);
    if (inputKeys.includes(outputKey)) {
      reasons.push("INVALID_CALCULATION_GRAPH");
      continue;
    }
    if (!inputKeys.every((key) => values.has(key))) {
      reasons.push("MISSING_INPUT_BINDING");
      continue;
    }

    const evaluated = evaluateCalculationExpression(method.expressionAst, values);
    if (!evaluated.ok) {
      reasons.push(evaluated.reason);
      continue;
    }

    values.set(outputKey, evaluated.value);
    units.set(outputKey, method.resultUnit);
    produced.add(outputKey);
    const renderedExpression = renderCalculationExpression(method.expressionAst, values);
    steps.push({
      outputQuantity: method.outputQuantity,
      outputQuantityKey: method.outputQuantityKey,
      inputQuantities: method.inputQuantities,
      inputQuantityKeys: method.inputQuantityKeys,
      expression: method.expressionAst,
      renderedExpression,
      result: evaluated.value,
      displayResult: displayResultForMethod(method),
      unit: method.resultUnit,
      sourceLabels: method.sourceLabels,
    });

    if (
      method.referenceResult &&
      !numbersClose(evaluated.value, method.referenceResult.value)
    ) {
      reasons.push("REFERENCE_RESULT_MISMATCH");
    }
  }

  if (reasons.length > 0) {
    return {
      ok: false,
      failure: {
        code: "CALCULATION_EXECUTION_FAILED",
        reasons: uniqueReasons(reasons),
      },
    };
  }

  const finalTarget = contract.calculationPlan.finalTarget;
  const finalKey = contract.calculationPlan.finalTargetKey
    ? normalizeKey(contract.calculationPlan.finalTargetKey)
    : normalizeKey(finalTarget ?? "");
  if (!finalTarget || !finalKey || !values.has(finalKey) || !produced.has(finalKey)) {
    return {
      ok: false,
      failure: {
        code: "INCOMPLETE_CALCULATION_PLAN",
        reasons: ["UNREACHABLE_FINAL_TARGET"],
      },
    };
  }

  const finalResult = values.get(finalKey)!;
  const finalStep = steps.find(
    (step) => normalizeKey(step.outputQuantityKey) === finalKey
  );
  const comparisonResult = inferComparisonResult(steps, contract);
  const reference = finalStep
    ? contract.authorisedMethods.find(
        (method) =>
          normalizeKey(method.outputQuantityKey) ===
          normalizeKey(finalStep.outputQuantityKey)
      )?.referenceResult
    : undefined;

  return {
    ok: true,
    trace: {
      steps,
      finalTarget,
      finalResult,
      finalResultDisplay: finalStep?.displayResult,
      finalUnit: units.get(finalKey),
      sourceLabels: uniqueStrings(contract.sourceLabels),
      referenceCheck: reference
        ? {
            expected: reference.value,
            actual: finalResult,
            unit: reference.unit,
            matches: numbersClose(reference.value, finalResult),
          }
        : undefined,
      comparisonResult,
    },
  };
}

export function validateCalculationPlan(
  contract: CalculationContract
): CalculationPlanFailureReason[] {
  const reasons: CalculationPlanFailureReason[] = [];
  if (!contract.calculationPlan.finalTarget) {
    reasons.push("UNREACHABLE_FINAL_TARGET");
  }
  if (contract.authorisedMethods.length === 0) {
    reasons.push("MISSING_AUTHORISED_METHOD");
  }

  const nodeKeys = new Set<string>();
  const available = new Set<string>();
  for (const node of contract.calculationPlan.nodes) {
    const key = normalizeKey(node.calculationKey);
    if (!key) continue;
    if (nodeKeys.has(key)) {
      reasons.push("AMBIGUOUS_QUANTITY_BINDING");
    }
    nodeKeys.add(key);
    if (node.origin !== "GIVEN_INPUT") continue;
    const numeric = parseNumericValue(node.value);
    if (numeric === undefined) {
      reasons.push("MISSING_INPUT_BINDING");
    } else {
      available.add(key);
    }
  }

  const produced = new Set<string>();
  for (const method of contract.authorisedMethods) {
    const outputKey = normalizeKey(method.outputQuantityKey);
    if (!outputKey || produced.has(outputKey)) {
      reasons.push("AMBIGUOUS_QUANTITY_BINDING");
    }
    produced.add(outputKey);
    const inputKeys = method.inputQuantityKeys.map(normalizeKey);
    if (inputKeys.includes(outputKey)) {
      reasons.push("INVALID_CALCULATION_GRAPH");
    }
    for (const inputKey of inputKeys) {
      if (!available.has(inputKey)) {
        reasons.push("MISSING_INPUT_BINDING");
      }
    }
    if (!method.expressionAst) {
      reasons.push("MISSING_AUTHORISED_METHOD");
    }
    available.add(outputKey);
  }

  const finalKey = normalizeKey(
    contract.calculationPlan.finalTargetKey ?? contract.calculationPlan.finalTarget ?? ""
  );
  if (finalKey && !produced.has(finalKey)) {
    reasons.push("UNREACHABLE_FINAL_TARGET");
  }

  return uniqueReasons(reasons);
}

export function evaluateCalculationExpression(
  expression: CalculationExpression,
  values: Map<string, number>
):
  | { ok: true; value: number }
  | { ok: false; reason: CalculationPlanFailureReason } {
  switch (expression.kind) {
    case "VALUE": {
      const value = values.get(normalizeKey(expression.quantityKey));
      return value === undefined
        ? { ok: false, reason: "MISSING_INPUT_BINDING" }
        : { ok: true, value };
    }
    case "CONSTANT":
      return Number.isFinite(expression.value)
        ? { ok: true, value: expression.value }
        : { ok: false, reason: "NON_FINITE_RESULT" };
    case "ADD":
    case "SUBTRACT":
    case "MULTIPLY":
    case "DIVIDE": {
      const left = evaluateCalculationExpression(expression.left, values);
      if (!left.ok) return left;
      const right = evaluateCalculationExpression(expression.right, values);
      if (!right.ok) return right;
      if (expression.kind === "DIVIDE" && numbersClose(right.value, 0)) {
        return { ok: false, reason: "DIVISION_BY_ZERO" };
      }
      const value =
        expression.kind === "ADD"
          ? left.value + right.value
          : expression.kind === "SUBTRACT"
            ? left.value - right.value
            : expression.kind === "MULTIPLY"
              ? left.value * right.value
              : left.value / right.value;
      return Number.isFinite(value)
        ? { ok: true, value }
        : { ok: false, reason: "NON_FINITE_RESULT" };
    }
  }
}

export function renderCalculationExpression(
  expression: CalculationExpression,
  values: Map<string, number>
): string {
  switch (expression.kind) {
    case "VALUE":
      return numberToText(values.get(normalizeKey(expression.quantityKey)) ?? NaN);
    case "CONSTANT":
      return numberToText(expression.value);
    case "ADD":
      return `${renderCalculationExpression(expression.left, values)} + ${renderCalculationExpression(expression.right, values)}`;
    case "SUBTRACT":
      return `${renderCalculationExpression(expression.left, values)} - ${renderCalculationExpression(expression.right, values)}`;
    case "MULTIPLY":
      return `${renderCalculationExpression(expression.left, values)} * ${renderCalculationExpression(expression.right, values)}`;
    case "DIVIDE":
      return `${renderCalculationExpression(expression.left, values)} / ${renderCalculationExpression(expression.right, values)}`;
  }
}

export function valueExpression(quantityKey: string): CalculationExpression {
  return { kind: "VALUE", quantityKey };
}

export function constantExpression(value: number): CalculationExpression {
  return { kind: "CONSTANT", value };
}

export function binaryExpression(
  kind: "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE",
  left: CalculationExpression,
  right: CalculationExpression
): CalculationExpression {
  return { kind, left, right };
}

function inferComparisonResult(
  steps: ValidatedCalculationStep[],
  contract: CalculationContract
): { label: string; result: string; sourceLabels: string[] } | undefined {
  if (!contract.calculationPlan.comparison || steps.length < 2) return undefined;
  const lowerIsBetter = contract.calculationPlan.comparison.kind === "LOWER_IS_BETTER";
  const candidates = steps.filter((step) =>
    contract.calculationPlan.comparison?.candidateOutputKeys
      .map(normalizeKey)
      .includes(normalizeKey(step.outputQuantityKey))
  );
  if (candidates.length < 2) return undefined;
  const selected = candidates.reduce((best, current) =>
    lowerIsBetter
      ? current.result < best.result
        ? current
        : best
      : current.result > best.result
        ? current
        : best
  );
  const tied = candidates.filter((candidate) =>
    numbersClose(candidate.result, selected.result)
  );
  if (tied.length > 1) {
    const labels = tied.map((candidate) =>
      optionLabelFromQuantity(candidate.outputQuantity)
    );
    return {
      label: contract.calculationPlan.comparison.label,
      result: `${labels.join(" and ")} are tied`,
      sourceLabels: uniqueStrings(candidates.flatMap((candidate) => candidate.sourceLabels)),
    };
  }
  const label = optionLabelFromQuantity(selected.outputQuantity);
  return {
    label: contract.calculationPlan.comparison.label,
    result: label || selected.outputQuantity,
    sourceLabels: uniqueStrings(candidates.flatMap((candidate) => candidate.sourceLabels)),
  };
}

function optionLabelFromQuantity(value: string) {
  const match = value.match(/\b((?:crate|option|pack|plan|shop|bundle|ticket)\s+[A-Za-z0-9]+)\b/i);
  return match?.[1] ?? value;
}

function parseNumericValue(value: string) {
  const numeric = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.%/]+/g, " ").replace(/\s+/g, " ").trim();
}

function uniqueReasons(reasons: CalculationPlanFailureReason[]) {
  return [...new Set(reasons)];
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function numbersClose(left: number, right: number) {
  return Math.abs(left - right) <= EPSILON;
}

function numberToText(value: number) {
  if (!Number.isFinite(value)) return "NaN";
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(10)));
}

function displayResultForMethod(method: CalculationContract["authorisedMethods"][number]) {
  const referenceUnit = method.referenceResult?.unit?.trim();
  if (referenceUnit && /^\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?$/.test(referenceUnit)) {
    return referenceUnit.replace(/\s+/g, "");
  }
  return method.result;
}
