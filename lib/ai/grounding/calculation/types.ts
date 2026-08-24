export type CalculationExpression =
  | { kind: "VALUE"; quantityKey: string }
  | { kind: "CONSTANT"; value: number }
  | { kind: "ADD"; left: CalculationExpression; right: CalculationExpression }
  | { kind: "SUBTRACT"; left: CalculationExpression; right: CalculationExpression }
  | { kind: "MULTIPLY"; left: CalculationExpression; right: CalculationExpression }
  | { kind: "DIVIDE"; left: CalculationExpression; right: CalculationExpression };

export type CalculationPlanFailureReason =
  | "MISSING_INPUT_BINDING"
  | "MISSING_AUTHORISED_METHOD"
  | "UNREACHABLE_FINAL_TARGET"
  | "AMBIGUOUS_QUANTITY_BINDING"
  | "INVALID_CALCULATION_GRAPH"
  | "REFERENCE_RESULT_MISMATCH"
  | "DIVISION_BY_ZERO"
  | "NON_FINITE_RESULT"
  | "INCOMPATIBLE_UNITS";

export type ValidatedCalculationStep = {
  outputQuantity: string;
  outputQuantityKey: string;
  inputQuantities: string[];
  inputQuantityKeys: string[];
  expression: CalculationExpression;
  renderedExpression: string;
  result: number;
  unit?: string;
  sourceLabels: string[];
};

export type ValidatedCalculationTrace = {
  steps: ValidatedCalculationStep[];
  finalTarget: string;
  finalResult: number;
  finalUnit?: string;
  sourceLabels: string[];
  referenceCheck?: {
    expected: number;
    actual: number;
    unit?: string;
    matches: boolean;
  };
  comparisonResult?: {
    label: string;
    result: string;
    sourceLabels: string[];
  };
};

export type CalculationExecutionFailure = {
  code: "INCOMPLETE_CALCULATION_PLAN" | "CALCULATION_EXECUTION_FAILED";
  reasons: CalculationPlanFailureReason[];
};

export type CalculationExecutionResult =
  | { ok: true; trace: ValidatedCalculationTrace }
  | { ok: false; failure: CalculationExecutionFailure };
