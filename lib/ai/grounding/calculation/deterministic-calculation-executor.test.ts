import { describe, expect, it } from "vitest";
import { extractEvidenceCapability } from "../capabilities/evidence-capability-extractor";
import type { AuthorizedEvidenceChunk } from "../capabilities/types";
import { decideAnswerability } from "../answerability/answerability-decider";
import { extractRequestRequirements } from "../requirements/request-requirement-extractor";
import {
  buildCalculationContract,
  structuredCalculationOutputFromTrace,
  type CalculationContract,
} from "../task-output";
import {
  binaryExpression,
  constantExpression,
  executeCalculationPlan,
  valueExpression,
} from "./deterministic-calculation-executor";

const subjectId = "eval-subject-mathematics";
const topicId = "eval-topic-calculation";

function chunk(content: string, overrides: Partial<AuthorizedEvidenceChunk> = {}) {
  return {
    resourceChunkId: overrides.resourceChunkId ?? "chunk-1",
    sourceLabel: overrides.sourceLabel ?? "SOURCE_1",
    subjectId: overrides.subjectId ?? subjectId,
    topicId: overrides.topicId ?? topicId,
    title: overrides.title ?? "Calculation fixture",
    content,
  } satisfies AuthorizedEvidenceChunk;
}

function contractFor(question: string, content: string) {
  const capability = extractEvidenceCapability(chunk(content));
  const requestRequirements = extractRequestRequirements({
    requestId: "request-1",
    question,
    subjectId,
    topicId,
  });
  const decision = decideAnswerability({
    requestRequirements,
    evidenceCapabilities: [capability],
    conflicts: [],
  });
  const contract = buildCalculationContract(decision.validatedEvidenceUnits, {
    requestRequirements,
    answerabilityDecision: decision,
    evidenceCapabilities: [capability],
  });
  return { capability, requestRequirements, decision, contract };
}

function simpleContract(overrides: Partial<CalculationContract> = {}): CalculationContract {
  const contract: CalculationContract = {
    quantities: [
      {
        quantity: "a",
        calculationKey: "a",
        value: "10",
        role: "quantityValue",
        origin: "GIVEN_INPUT",
        sourceLabels: ["SOURCE_1"],
      },
      {
        quantity: "b",
        calculationKey: "b",
        value: "2",
        role: "quantityValue",
        origin: "GIVEN_INPUT",
        sourceLabels: ["SOURCE_1"],
      },
    ],
    authorisedMethods: [
      {
        targetQuantity: "result",
        outputQuantity: "result",
        outputQuantityKey: "result",
        inputQuantities: ["a", "b"],
        inputQuantityKeys: ["a", "b"],
        operation: "/",
        expressionAst: binaryExpression("DIVIDE", valueExpression("a"), valueExpression("b")),
        expression: "10 / 2",
        result: "5",
        sourceLabels: ["SOURCE_1"],
      },
    ],
    calculationPlan: {
      nodes: [
        {
          quantity: "a",
          calculationKey: "a",
          value: "10",
          role: "quantityValue",
          origin: "GIVEN_INPUT",
        },
        {
          quantity: "b",
          calculationKey: "b",
          value: "2",
          role: "quantityValue",
          origin: "GIVEN_INPUT",
        },
      ],
      steps: [
        {
          outputQuantity: "result",
          outputQuantityKey: "result",
          inputQuantities: ["a", "b"],
          inputQuantityKeys: ["a", "b"],
          operation: "/",
          expressionAst: binaryExpression("DIVIDE", valueExpression("a"), valueExpression("b")),
          expression: "10 / 2",
          result: "5",
        },
      ],
      finalTarget: "result",
      finalTargetKey: "result",
    },
    sourceLabels: ["SOURCE_1"],
  };
  return { ...contract, ...overrides };
}

describe("deterministic calculation executor", () => {
  it("executes simple interest from symbolic aliases without binding I to a RHS value", () => {
    const { decision, contract } = contractFor(
      "Calculate the simple interest.",
      "Simple interest formula: I = P x R x T / 100. For the loan example, P is 600, R is 5 percent, and T is 2 years, so I = 600 x 5 x 2 / 100 = 60."
    );

    expect(decision.calculationPaths?.some((path) => path.complete)).toBe(true);
    expect(contract.quantities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ calculationKey: "principal", value: "600" }),
        expect.objectContaining({ calculationKey: "rate", value: "5" }),
        expect.objectContaining({ calculationKey: "time", value: "2" }),
      ])
    );
    expect(contract.quantities).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ calculationKey: "interest", value: "600" }),
      ])
    );
    const result = executeCalculationPlan(contract);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trace.finalTarget).toBe("interest");
    expect(result.trace.finalResult).toBe(60);
    expect(result.trace.referenceCheck).toEqual(
      expect.objectContaining({ expected: 60, actual: 60, matches: true })
    );
  });

  it("fails safely when a reference result conflicts with deterministic execution", () => {
    const { contract } = contractFor(
      "Calculate the simple interest.",
      "Simple interest formula: I = P x R x T / 100. For the loan example, P is 600, R is 5 percent, and T is 2 years, so I = 600 x 5 x 2 / 100 = 61."
    );
    const result = executeCalculationPlan(contract);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.reasons).toContain("REFERENCE_RESULT_MISMATCH");
  });

  it("executes option-scoped unit rates and keeps option operands isolated", () => {
    const { contract } = contractFor(
      "Which crate is better value per bottle?",
      "Cost per bottle is total cost divided by bottles. Crate A costs 720 naira for 12 bottles. Crate B costs 500 naira for 5 bottles."
    );

    expect(contract.authorisedMethods).toEqual([
      expect.objectContaining({
        outputQuantityKey: "crate a unit rate",
        inputQuantityKeys: ["crate a total cost", "crate a bottle count"],
        result: "60",
      }),
      expect.objectContaining({
        outputQuantityKey: "crate b unit rate",
        inputQuantityKeys: ["crate b total cost", "crate b bottle count"],
        result: "100",
      }),
    ]);
    expect(contract.authorisedMethods).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ expression: "720 / 5" }),
        expect.objectContaining({ expression: "500 / 12" }),
      ])
    );
    const result = executeCalculationPlan(contract);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trace.steps.map((step) => step.renderedExpression)).toEqual([
      "720 / 12",
      "500 / 5",
    ]);
    expect(result.trace.comparisonResult).toEqual(
      expect.objectContaining({ label: "better value", result: "crate a" })
    );
  });

  it("executes speed from distance and time while treating source speed as a reference only", () => {
    const { contract } = contractFor(
      "Calculate speed from 120 metres in 10 seconds.",
      "Speed is distance divided by time. A runner covers 120 metres in 10 seconds, so speed = 120 / 10 = 12 m/s."
    );

    expect(contract.quantities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ calculationKey: "distance", value: "120" }),
        expect.objectContaining({ calculationKey: "time", value: "10" }),
      ])
    );
    expect(contract.quantities).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ calculationKey: "speed", origin: "GIVEN_INPUT" }),
      ])
    );
    const result = executeCalculationPlan(contract);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.trace.steps[0]).toEqual(
      expect.objectContaining({
        outputQuantity: "speed",
        renderedExpression: "120 / 10",
        result: 12,
      })
    );
    expect(result.trace.referenceCheck?.matches).toBe(true);
  });

  it("preserves directed ratio and percentage plans", () => {
    const ratio = contractFor(
      "Work through the boys to girls ratio example.",
      "Worked ratio example: if boys:girls = 2:3 and boys = 10, then one part is 5, so girls = 15. Always keep the order of the compared quantities."
    );
    const ratioResult = executeCalculationPlan(ratio.contract);
    expect(ratioResult.ok).toBe(true);
    if (ratioResult.ok) {
      expect(ratioResult.trace.steps.map((step) => step.renderedExpression)).toEqual([
        "10 / 2",
        "3 * 5",
      ]);
      expect(structuredCalculationOutputFromTrace(ratioResult.trace).finalResult).toBe("15");
    }

    const percentage = contractFor(
      "Work through the percentage discount example.",
      "A 20 percent discount on 500 is 100. The new price after the discount is 400."
    );
    const percentageResult = executeCalculationPlan(percentage.contract);
    expect(percentageResult.ok).toBe(true);
    if (percentageResult.ok) {
      expect(percentageResult.trace.steps.map((step) => step.renderedExpression)).toEqual([
        "20 / 100 * 500",
        "500 - 100",
      ]);
      expect(percentageResult.trace.finalResult).toBe(400);
    }
  });

  it("rejects incomplete or invalid calculation plans", () => {
    expect(
      executeCalculationPlan(simpleContract({ authorisedMethods: [] })).ok
    ).toBe(false);
    const missing = executeCalculationPlan(
      simpleContract({
        authorisedMethods: [
          {
            ...simpleContract().authorisedMethods[0]!,
            inputQuantityKeys: ["a", "missing"],
            expressionAst: binaryExpression("DIVIDE", valueExpression("a"), valueExpression("missing")),
          },
        ],
      })
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.failure.reasons).toContain("MISSING_INPUT_BINDING");

    const cycle = executeCalculationPlan(
      simpleContract({
        authorisedMethods: [
          {
            ...simpleContract().authorisedMethods[0]!,
            inputQuantityKeys: ["a", "result"],
            expressionAst: binaryExpression("DIVIDE", valueExpression("a"), valueExpression("result")),
          },
        ],
      })
    );
    expect(cycle.ok).toBe(false);
    if (!cycle.ok) expect(cycle.failure.reasons).toContain("INVALID_CALCULATION_GRAPH");

    const zeroDivision = executeCalculationPlan(
      simpleContract({
        quantities: [
          ...simpleContract().quantities.filter((quantity) => quantity.calculationKey !== "b"),
          {
            quantity: "b",
            calculationKey: "b",
            value: "0",
            role: "quantityValue",
            origin: "GIVEN_INPUT",
            sourceLabels: ["SOURCE_1"],
          },
        ],
        calculationPlan: {
          ...simpleContract().calculationPlan,
          nodes: [
            ...simpleContract().calculationPlan.nodes.filter((node) => node.calculationKey !== "b"),
            {
              quantity: "b",
              calculationKey: "b",
              value: "0",
              role: "quantityValue",
              origin: "GIVEN_INPUT",
            },
          ],
        },
      })
    );
    expect(zeroDivision.ok).toBe(false);
    if (!zeroDivision.ok) expect(zeroDivision.failure.reasons).toContain("DIVISION_BY_ZERO");
  });

  it("does not allow reference-result nodes as upstream operands", () => {
    const base = simpleContract();
    const result = executeCalculationPlan({
      ...base,
      quantities: [
        ...base.quantities,
        {
          quantity: "reference",
          calculationKey: "reference",
          value: "5",
          role: "quantityValue",
          origin: "REFERENCE_RESULT",
          sourceLabels: ["SOURCE_1"],
        },
      ],
      authorisedMethods: [
        {
          ...base.authorisedMethods[0]!,
          inputQuantityKeys: ["reference", "b"],
          expressionAst: binaryExpression("DIVIDE", valueExpression("reference"), valueExpression("b")),
        },
      ],
      calculationPlan: {
        ...base.calculationPlan,
        nodes: [
          ...base.calculationPlan.nodes,
          {
            quantity: "reference",
            calculationKey: "reference",
            value: "5",
            role: "quantityValue",
            origin: "REFERENCE_RESULT",
          },
        ],
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.reasons).toContain("MISSING_INPUT_BINDING");
  });

  it("is deterministic for repeated executions of the same complete plan", () => {
    const contract = simpleContract({
      authorisedMethods: [
        {
          ...simpleContract().authorisedMethods[0]!,
          expressionAst: binaryExpression(
            "ADD",
            binaryExpression("MULTIPLY", valueExpression("a"), valueExpression("b")),
            constantExpression(3)
          ),
          expression: "10 * 2 + 3",
          result: "23",
          operation: "+",
        },
      ],
      calculationPlan: {
        ...simpleContract().calculationPlan,
        steps: [
          {
            ...simpleContract().calculationPlan.steps[0]!,
            expressionAst: binaryExpression(
              "ADD",
              binaryExpression("MULTIPLY", valueExpression("a"), valueExpression("b")),
              constantExpression(3)
            ),
            expression: "10 * 2 + 3",
            result: "23",
            operation: "+",
          },
        ],
      },
    });
    const first = executeCalculationPlan(contract);
    const second = executeCalculationPlan(contract);
    expect(first).toEqual(second);
  });
});
