import { describe, expect, it } from "vitest";
import {
  ResourceChunkType,
  ResourceSourceKind,
  type ResourceEmbeddingConfiguration,
} from "@prisma/client";
import { FakeChatModelProvider } from "@/lib/ai/chat/fake-provider";
import type { EmbeddingProvider } from "@/lib/ai/embeddings/types";
import type {
  RetrievedChunk,
  ResourceSearchRepository,
} from "@/lib/resources/retrieval/types";
import { extractEvidenceCapability } from "./capabilities/evidence-capability-extractor";
import type { AuthorizedEvidenceChunk } from "./capabilities/types";
import { decideAnswerability } from "./answerability/answerability-decider";
import { extractRequestRequirements } from "./requirements/request-requirement-extractor";
import { CapabilityGroundingPipeline } from "./pipelines/capability-grounding-pipeline";
import {
  buildCalculationContract,
  buildFormulaContract,
  buildStructuredCalculationPrompt,
  buildStructuredFormulaPrompt,
  validateFormulaContractCompleteness,
  validateCalculationAnswerViewModel,
  renderStructuredCalculationAnswer,
  structuredCalculationOutputFromTrace,
  structuredCalculationOutputSchema,
  structuredFormulaOutputSchema,
  selectTaskOutputMode,
  validateStructuredCalculationOutput,
  validateStructuredFormulaOutput,
} from "./task-output";
import { executeCalculationPlan } from "./calculation/deterministic-calculation-executor";

const subjectId = "eval-subject-mathematics";
const ratioTopicId = "eval-topic-ratio";
const geometryTopicId = "eval-topic-geometry";

function chunk(content: string, overrides: Partial<AuthorizedEvidenceChunk> = {}) {
  return {
    resourceChunkId: overrides.resourceChunkId ?? "chunk-1",
    sourceLabel: overrides.sourceLabel ?? "SOURCE_1",
    subjectId: overrides.subjectId ?? subjectId,
    topicId: overrides.topicId ?? ratioTopicId,
    title: overrides.title ?? "Test chunk",
    content,
  } satisfies AuthorizedEvidenceChunk;
}

function unitForCalculation(content: string) {
  const capability = extractEvidenceCapability(chunk(content));
  const requestRequirements = extractRequestRequirements({
    requestId: "request-1",
    question: "Work through the boys to girls ratio example.",
    subjectId,
    topicId: ratioTopicId,
  });
  const decision = decideAnswerability({
    requestRequirements,
    evidenceCapabilities: [capability],
    conflicts: [],
  });
  return { capability, requestRequirements, decision };
}

function calculationDecision(input: {
  question: string;
  content: string;
  topicId?: string;
  subjectId?: string;
}) {
  const capability = extractEvidenceCapability(
    chunk(input.content, {
      subjectId: input.subjectId ?? subjectId,
      topicId: input.topicId ?? ratioTopicId,
    })
  );
  const requestRequirements = extractRequestRequirements({
    requestId: "request-1",
    question: input.question,
    subjectId: input.subjectId ?? subjectId,
    topicId: input.topicId ?? ratioTopicId,
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

function ratioDecision() {
  return unitForCalculation(
    "Worked ratio example: if boys:girls = 2:3 and boys = 10, then one part is 5, so girls = 15. Always keep the order of the compared quantities."
  );
}

function calculationOutput(overrides: Record<string, unknown> = {}) {
  return {
    steps: [
      {
        targetQuantity: "one part",
        expression: "10 / 2",
        result: "5",
        unit: "",
        sourceLabels: ["SOURCE_1"],
      },
      {
        targetQuantity: "girls",
        expression: "3 * 5",
        result: "15",
        unit: "",
        sourceLabels: ["SOURCE_1"],
      },
    ],
    finalQuantity: "girls",
    finalResult: "15",
    finalUnit: "",
    sourceLabels: ["SOURCE_1"],
    suggestedQuestions: [],
    ...overrides,
  };
}

function bindingUnit(
  bindings: Array<{
    quantityId: string;
    label: string;
    value: number;
    role?: string;
  }>
) {
  return {
    id: "unit-1",
    sourceLabel: "SOURCE_1",
    resourceChunkId: "chunk-1",
    capabilityIds: ["capability-1"],
    supportsRequirementIds: ["req-1"],
    quotedEvidence: "Test calculation evidence.",
    evidenceSpans: [{ text: "Test calculation evidence.", startOffset: 0, endOffset: 26 }],
    allowedUses: ["CALCULATE" as const],
    semanticQuantityBindings: bindings.map((binding) => ({
      ...binding,
      sourceCapabilityIds: ["capability-1"],
    })),
  };
}

function formulaDecision(content: string) {
  const capability = extractEvidenceCapability(
    chunk(content, {
      resourceChunkId: "geometry-chunk",
      topicId: geometryTopicId,
    })
  );
  const requestRequirements = extractRequestRequirements({
    requestId: "request-1",
    question: "Teach the triangle area formula and define the variables.",
    subjectId,
    topicId: geometryTopicId,
  });
  const decision = decideAnswerability({
    requestRequirements,
    evidenceCapabilities: [capability],
    conflicts: [],
  });
  return { capability, requestRequirements, decision };
}

function formulaOutput(overrides: Record<string, unknown> = {}) {
  return {
    expression: "Area = 1/2 * base * height",
    variables: [
      { symbol: "base", meaning: "base", sourceLabels: ["SOURCE_1"] },
      { symbol: "height", meaning: "perpendicular height", sourceLabels: ["SOURCE_1"] },
    ],
    units: [],
    conditions: [
      { text: "height meets the base at a right angle", sourceLabels: ["SOURCE_1"] },
    ],
    sourceLabels: ["SOURCE_1"],
    suggestedQuestions: [],
    ...overrides,
  };
}

class StaticSearchRepository implements ResourceSearchRepository {
  constructor(private readonly chunks: RetrievedChunk[]) {}

  async keywordSearch() {
    return this.chunks;
  }

  async vectorSearch() {
    return this.chunks;
  }

  async hybridSearch() {
    return this.chunks;
  }

  async getActiveEmbeddingConfiguration(): Promise<ResourceEmbeddingConfiguration | null> {
    return null;
  }
}

const noEmbeddingProvider: EmbeddingProvider = {
  async embedDocuments() {
    throw new Error("Embedding should not be called in these tests.");
  },
  async embedQuery() {
    throw new Error("Embedding should not be called in these tests.");
  },
  getDimensions: () => 1536,
  getModelName: () => "fake",
  getProviderName: () => "fake",
};

function retrievedChunk(id: string, content: string, overrides: Partial<RetrievedChunk> = {}) {
  return {
    id,
    resourceId: overrides.resourceId ?? id.replace("chunk", "resource"),
    resourceTitle: overrides.resourceTitle ?? "Test Resource",
    sourceKind: ResourceSourceKind.UPLOAD,
    chunkIndex: 0,
    chunkType: ResourceChunkType.CONTENT_SECTION,
    title: overrides.title ?? null,
    content,
    snippet: content,
    contentHash: `hash-${id}`,
    subjectId: overrides.subjectId ?? subjectId,
    topicId: overrides.topicId ?? ratioTopicId,
    questionNumber: null,
    vectorRank: null,
    vectorDistance: null,
    keywordRank: 1,
    keywordScore: 1,
    exactSignals: [],
    fusionScore: 1,
    bestBranchRank: 1,
    alternateProvenance: [],
    ...overrides,
  } satisfies RetrievedChunk;
}

describe("Stage 4.1 structured task output", () => {
  it("preserves the boys:girls ratio order in model-visible validated evidence", () => {
    const { decision } = ratioDecision();
    const quotes = decision.validatedEvidenceUnits.map((unit) => unit.quotedEvidence);

    expect(quotes.join("\n")).toContain("boys:girls = 2:3");
    expect(quotes).not.toContainEqual(expect.stringMatching(/^girls\s*=\s*2\s*:\s*3\b/i));
    expect(decision.validatedEvidenceUnits[0]?.semanticQuantityBindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          quantityId: "boys",
          value: 2,
          role: "ratioPartValue",
        }),
        expect.objectContaining({
          quantityId: "girls",
          value: 3,
          role: "ratioPartValue",
        }),
      ])
    );
  });

  it("validates and renders the authorised ratio calculation trace", () => {
    const { decision } = ratioDecision();
    const contract = buildCalculationContract(decision.validatedEvidenceUnits);
    const result = validateStructuredCalculationOutput({
      value: calculationOutput(),
      contract,
      validatedEvidenceUnits: decision.validatedEvidenceUnits,
    });

    expect(result.supported).toBe(true);
    expect(contract.authorisedMethods).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetQuantity: "one part",
          inputQuantities: ["boys", "boys"],
          inputQuantityKeys: ["boys count", "boys ratio part"],
          expression: "10 / 2",
          result: "5",
        }),
        expect.objectContaining({
          targetQuantity: "girls",
          inputQuantities: ["girls", "one part"],
          inputQuantityKeys: ["girls ratio part", "one part"],
          expression: "3 * 5",
          result: "15",
        }),
      ])
    );
    expect(contract.quantities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          quantity: "boys",
          calculationKey: "boys count",
          origin: "GIVEN_INPUT",
        }),
        expect.objectContaining({
          quantity: "girls",
          calculationKey: "girls count",
          origin: "REFERENCE_RESULT",
        }),
      ])
    );
    if (!result.supported) {
      throw new Error("Expected ratio calculation output to be supported.");
    }
    const rendered = renderStructuredCalculationAnswer(result.output, contract).content;
    expect(rendered).toContain("one part = 10 / 2 = 5");
    expect(rendered).toContain("girls = 3 × 5 = 15");
    expect(rendered).not.toContain("15 / 3");
  });

  it("executes bounded probability from grounded count and total without provider arithmetic", () => {
    const { requestRequirements, decision, contract } = calculationDecision({
      question: "What is the probability of rolling an even number on a fair die?",
      topicId: "eval-topic-probability",
      content:
        "Probability is favourable outcomes divided by total equally likely outcomes. For a fair six-sided die, the probability of rolling an even number is 3 out of 6, which simplifies to 1/2.",
    });

    expect(requestRequirements.requirements[0]).toEqual(
      expect.objectContaining({
        kind: "CALCULATION",
        targetConcepts: ["probability"],
        requestedEvent: "rolling an even number on a fair die",
      })
    );
    expect(selectTaskOutputMode({ requestRequirements, answerabilityDecision: decision })).toBe(
      "STRUCTURED_CALCULATION"
    );
    expect(decision.classification).toBe("SUPPORTED");
    expect(decision.validatedEvidenceUnits.flatMap((unit) => unit.semanticQuantityBindings ?? [])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          quantityId: "favourable outcomes",
          value: 3,
          role: "favourableOutcomeCount",
        }),
        expect.objectContaining({
          quantityId: "total outcomes",
          value: 6,
          role: "totalOutcomeCount",
        }),
        expect.objectContaining({
          quantityId: "probability",
          value: 0.5,
          unit: "1/2",
          role: "probabilityReferenceResult",
        }),
      ])
    );
    expect(contract.authorisedMethods).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetQuantity: "probability",
          inputQuantityKeys: ["favourable outcomes", "total outcomes"],
          expression: "3 / 6",
          result: "1/2",
          referenceResult: { value: 0.5, unit: "1/2" },
        }),
      ])
    );

    const execution = executeCalculationPlan(contract);
    expect(execution.ok).toBe(true);
    if (!execution.ok) throw new Error("Expected bounded probability plan to execute.");

    const output = structuredCalculationOutputFromTrace(execution.trace);
    const rendered = renderStructuredCalculationAnswer(output, contract);
    expect(rendered.validation.supported).toBe(true);
    expect(rendered.content).toMatch(/probability = 3\s*\/\s*6 = 1\/2/i);
    expect(rendered.content).toContain("Therefore, probability = 1/2.");
  });

  it.each([
    {
      label: "missing favourable count",
      question: "What is the probability of rolling an even number on a fair die?",
      content:
        "Probability is favourable outcomes divided by total equally likely outcomes. A fair die has 6 total outcomes.",
      expectedClassification: "INSUFFICIENT_CONTEXT",
    },
    {
      label: "missing total count",
      question: "What is the probability of rolling an even number on a fair die?",
      content:
        "Probability is favourable outcomes divided by total equally likely outcomes. The favourable outcome count is 3.",
      expectedClassification: "INSUFFICIENT_CONTEXT",
    },
    {
      label: "requires discovering outcomes",
      question: "List the favourable outcomes for rolling an even number on a fair die.",
      content:
        "Probability is favourable outcomes divided by total equally likely outcomes. For a fair six-sided die, the probability of rolling an even number is 3 out of 6.",
      expectedClassification: "INSUFFICIENT_CONTEXT",
    },
  ])("does not overextend bounded probability when $label", (item) => {
    const { decision } = calculationDecision({
      question: item.question,
      topicId: "eval-topic-probability",
      content: item.content,
    });

    expect(decision.classification).toBe(item.expectedClassification);
  });

  it("fails bounded probability safely for zero total and conflicting reference result", () => {
    const zeroTotal = calculationDecision({
      question: "What is the probability of rolling an even number on a fair die?",
      topicId: "eval-topic-probability",
      content:
        "Probability is favourable outcomes divided by total equally likely outcomes. For a fair six-sided die, the probability of rolling an even number is 3 out of 0.",
    });
    expect(zeroTotal.decision.classification).toBe("SUPPORTED");
    expect(executeCalculationPlan(zeroTotal.contract)).toMatchObject({
      ok: false,
      failure: expect.objectContaining({
        reasons: expect.arrayContaining(["MISSING_AUTHORISED_METHOD"]),
      }),
    });

    const conflictingReference = calculationDecision({
      question: "What is the probability of rolling an even number on a fair die?",
      topicId: "eval-topic-probability",
      content:
        "Probability is favourable outcomes divided by total equally likely outcomes. For a fair six-sided die, the probability of rolling an even number is 3 out of 6, which simplifies to 2/3.",
    });
    expect(conflictingReference.decision.classification).toBe("SUPPORTED");
    expect(executeCalculationPlan(conflictingReference.contract)).toMatchObject({
      ok: false,
      failure: expect.objectContaining({
        reasons: expect.arrayContaining(["REFERENCE_RESULT_MISMATCH"]),
      }),
    });
  });

  it("renders requested simple-interest formula and variable meanings from authorised evidence", () => {
    const { requestRequirements, decision, contract } = calculationDecision({
      question: "Use the loan card to calculate the simple interest and name the variables.",
      topicId: "eval-topic-commercial-arithmetic",
      content:
        "Simple interest formula: I = P x R x T / 100. For the loan example, P is 600, R is 5 percent, and T is 2 years, so I = 600 x 5 x 2 / 100 = 60.",
    });

    expect(requestRequirements.requirements[0]).toEqual(
      expect.objectContaining({
        kind: "CALCULATION",
        targetConcepts: ["simple interest"],
      })
    );
    expect(requestRequirements.normalizedQuestion).toMatch(/name the variables/i);
    expect(decision.calculationPaths?.[0]).toEqual(
      expect.objectContaining({
        complete: true,
        outputConcept: "simple-interest",
      })
    );
    expect(contract.presentationRequirements).toEqual(
      expect.objectContaining({
        showFormula: true,
        formula: expect.objectContaining({ expression: "I = P x R x T / 100" }),
        requestedSymbols: expect.arrayContaining([
          expect.objectContaining({ symbol: "I", quantityKey: "interest", meaning: "interest" }),
          expect.objectContaining({ symbol: "P", quantityKey: "principal", meaning: "principal" }),
          expect.objectContaining({ symbol: "R", quantityKey: "rate", meaning: "rate" }),
          expect.objectContaining({ symbol: "T", quantityKey: "time", meaning: "time" }),
        ]),
      })
    );

    const output = calculationOutput({
      steps: [
        {
          targetQuantity: "interest",
          expression: "600 * 5 * 2 / 100",
          result: "60",
          unit: "",
          sourceLabels: ["SOURCE_1"],
        },
      ],
      finalQuantity: "interest",
      finalResult: "60",
    });
    const result = validateStructuredCalculationOutput({
      value: output,
      contract,
      validatedEvidenceUnits: decision.validatedEvidenceUnits,
    });
    expect(result.supported).toBe(true);
    if (!result.supported) throw new Error("Expected simple-interest output to validate.");

    const rendered = renderStructuredCalculationAnswer(result.output, contract);
    expect(rendered.validation.supported).toBe(true);
    expect(rendered.content).toContain(
      "P means principal, R means rate, T means time, and I means interest."
    );
    expect(rendered.content).toContain("The formula is I = P × R × T / 100.");
    expect(rendered.content).toContain("P = 600");
    expect(rendered.content).toContain("R = 5 percent");
    expect(rendered.content).toContain("T = 2 years");
    expect(rendered.content).toContain("I = 600 × 5 × 2 / 100 = 60");
    expect(rendered.content).toContain("Therefore, interest = 60.");
  });

  it("does not invent conventional symbols when calculation evidence uses named quantities only", () => {
    const { contract, decision } = calculationDecision({
      question: "Calculate speed from the card and name the variables.",
      topicId: "eval-topic-speed",
      content:
        "Speed is distance divided by time. A runner covers 120 metres in 10 seconds, so speed = 120 / 10 = 12 m/s.",
    });
    const result = validateStructuredCalculationOutput({
      value: calculationOutput({
        steps: [
          {
            targetQuantity: "speed",
            expression: "120 / 10",
            result: "12",
            unit: "metres/seconds",
            sourceLabels: ["SOURCE_1"],
          },
        ],
        finalQuantity: "speed",
        finalResult: "12",
        finalUnit: "metres/seconds",
      }),
      contract,
      validatedEvidenceUnits: decision.validatedEvidenceUnits,
    });
    expect(result.supported).toBe(true);
    if (!result.supported) throw new Error("Expected speed output to validate.");

    const rendered = renderStructuredCalculationAnswer(result.output, contract).content;
    expect(rendered).not.toMatch(/\bv means speed\b/i);
    expect(rendered).not.toMatch(/\bd means distance\b/i);
    expect(rendered).not.toMatch(/\bt means time\b/i);
  });

  it("fails presentation validation when a requested formula is not renderable", () => {
    const { contract } = calculationDecision({
      question: "Use the loan card to calculate the simple interest and name the variables.",
      topicId: "eval-topic-commercial-arithmetic",
      content:
        "Simple interest formula: I = P x R x T / 100. For the loan example, P is 600, R is 5 percent, and T is 2 years, so I = 600 x 5 x 2 / 100 = 60.",
    });
    const validation = validateCalculationAnswerViewModel(
      {
        symbolDefinitions: contract.presentationRequirements.requestedSymbols,
        givenValues: [],
        steps: [],
        finalResult: {
          quantity: "interest",
          result: "60",
          unit: "",
          sourceLabels: ["SOURCE_1"],
        },
      },
      {
        ...contract,
        presentationRequirements: {
          ...contract.presentationRequirements,
          showFormula: true,
          formula: undefined,
        },
      },
      "P means principal."
    );

    expect(validation.supported).toBe(false);
    expect(validation.errors.map((error) => error.code)).toContain("MISSING_REQUIRED_STEP");
  });

  it("rejects circular or backwards ratio dependency paths even with correct final values", () => {
    const { decision } = ratioDecision();
    const contract = buildCalculationContract(decision.validatedEvidenceUnits);
    const backwardsIntermediate = validateStructuredCalculationOutput({
      value: calculationOutput({
        steps: [
          {
            targetQuantity: "one part",
            expression: "10 / 2",
            result: "5",
            unit: "",
            sourceLabels: ["SOURCE_1"],
          },
          {
            targetQuantity: "girls",
            expression: "3 * 5",
            result: "15",
            unit: "",
            sourceLabels: ["SOURCE_1"],
          },
          {
            targetQuantity: "one part",
            expression: "15 / 3",
            result: "5",
            unit: "",
            sourceLabels: ["SOURCE_1"],
          },
        ],
      }),
      contract,
      validatedEvidenceUnits: decision.validatedEvidenceUnits,
    });
    expect(backwardsIntermediate.supported).toBe(false);
    expect(backwardsIntermediate.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(["UNSUPPORTED_OPERATION"])
    );

    const referenceAsInput = validateStructuredCalculationOutput({
      value: calculationOutput({
        steps: [
          {
            targetQuantity: "one part",
            expression: "15 / 3",
            result: "5",
            unit: "",
            sourceLabels: ["SOURCE_1"],
          },
          {
            targetQuantity: "girls",
            expression: "3 * 5",
            result: "15",
            unit: "",
            sourceLabels: ["SOURCE_1"],
          },
        ],
      }),
      contract,
      validatedEvidenceUnits: decision.validatedEvidenceUnits,
    });
    expect(referenceAsInput.supported).toBe(false);
    expect(referenceAsInput.errors.map((error) => error.code)).toContain(
      "UNSUPPORTED_OPERATION"
    );
  });

  it("rejects wrong ratio roles, invented paths, contradictions, and wrong labels", () => {
    const { decision } = ratioDecision();
    const contract = buildCalculationContract(decision.validatedEvidenceUnits);
    const invalidGirls = validateStructuredCalculationOutput({
      value: calculationOutput({
        steps: [
          {
            targetQuantity: "girls",
            expression: "2 * 5",
            result: "10",
            unit: "",
            sourceLabels: ["SOURCE_1"],
          },
        ],
        finalResult: "10",
      }),
      contract,
      validatedEvidenceUnits: decision.validatedEvidenceUnits,
    });
    expect(invalidGirls.supported).toBe(false);
    expect(invalidGirls.errors.map((error) => error.code)).toContain(
      "WRONG_SEMANTIC_BINDING"
    );

    const inventedPath = validateStructuredCalculationOutput({
      value: calculationOutput({
        steps: [
          {
            targetQuantity: "one part",
            expression: "10 / 3",
            result: "3.33",
            unit: "",
            sourceLabels: ["SOURCE_1"],
          },
        ],
      }),
      contract,
      validatedEvidenceUnits: decision.validatedEvidenceUnits,
    });
    expect(inventedPath.supported).toBe(false);

    const contradiction = validateStructuredCalculationOutput({
      value: calculationOutput({
        steps: [
          {
            targetQuantity: "girls",
            expression: "3 * 5",
            result: "15",
            unit: "",
            sourceLabels: ["SOURCE_1"],
          },
          {
            targetQuantity: "girls",
            expression: "2 * 5",
            result: "10",
            unit: "",
            sourceLabels: ["SOURCE_1"],
          },
        ],
      }),
      contract,
      validatedEvidenceUnits: decision.validatedEvidenceUnits,
    });
    expect(contradiction.supported).toBe(false);
    expect(contradiction.errors.map((error) => error.code)).toContain(
      "CONTRADICTORY_ASSIGNMENT"
    );
  });

  it("rejects cross-domain semantic quantity swaps", () => {
    const examples = [
      {
        unit: bindingUnit([
          { quantityId: "original price", label: "original price", value: 500, role: "originalValue" },
          { quantityId: "sale price", label: "sale price", value: 400, role: "newValue" },
        ]),
        output: calculationOutput({
          steps: [{ targetQuantity: "original price", expression: "500 - 100", result: "400", unit: "", sourceLabels: ["SOURCE_1"] }],
          finalQuantity: "original price",
          finalResult: "400",
        }),
      },
      {
        unit: bindingUnit([
          { quantityId: "distance", label: "distance", value: 120, role: "distanceValue" },
          { quantityId: "time", label: "time", value: 10, role: "timeValue" },
          { quantityId: "speed", label: "speed", value: 12, role: "speedValue" },
        ]),
        output: calculationOutput({
          steps: [{ targetQuantity: "distance", expression: "120 / 10", result: "12", unit: "", sourceLabels: ["SOURCE_1"] }],
          finalQuantity: "distance",
          finalResult: "12",
        }),
      },
      {
        unit: bindingUnit([
          { quantityId: "voltage", label: "voltage", value: 12, role: "quantityValue" },
          { quantityId: "current", label: "current", value: 3, role: "quantityValue" },
          { quantityId: "resistance", label: "resistance", value: 4, role: "quantityValue" },
        ]),
        output: calculationOutput({
          steps: [{ targetQuantity: "current", expression: "12 / 3", result: "4", unit: "", sourceLabels: ["SOURCE_1"] }],
          finalQuantity: "current",
          finalResult: "4",
        }),
      },
      {
        unit: bindingUnit([
          { quantityId: "principal", label: "principal", value: 800, role: "principalValue" },
          { quantityId: "interest", label: "interest", value: 96, role: "interestValue" },
        ]),
        output: calculationOutput({
          steps: [{ targetQuantity: "principal", expression: "800 * 6 * 2 / 100", result: "96", unit: "", sourceLabels: ["SOURCE_1"] }],
          finalQuantity: "principal",
          finalResult: "96",
        }),
      },
      {
        unit: bindingUnit([
          { quantityId: "crate a unit price", label: "crate a unit price", value: 60, role: "unitRateValue" },
          { quantityId: "crate b unit price", label: "crate b unit price", value: 100, role: "unitRateValue" },
        ]),
        output: calculationOutput({
          steps: [{ targetQuantity: "crate a unit price", expression: "500 / 5", result: "100", unit: "", sourceLabels: ["SOURCE_1"] }],
          finalQuantity: "crate a unit price",
          finalResult: "100",
        }),
      },
    ];

    for (const example of examples) {
      const result = validateStructuredCalculationOutput({
        value: example.output,
        contract: buildCalculationContract([example.unit]),
        validatedEvidenceUnits: [example.unit],
      });
      expect(result.supported).toBe(false);
      expect(result.errors.map((error) => error.code)).toContain(
        "WRONG_SEMANTIC_BINDING"
      );
    }
  });

  it("enforces directed calculation plans across common domains", () => {
    const percentageUnit = bindingUnit([
      { quantityId: "discount-rate", label: "discount rate", value: 20, role: "rateValue" },
      { quantityId: "original-price", label: "original price", value: 500, role: "originalValue" },
      { quantityId: "discount", label: "discount", value: 100, role: "discountValue" },
      { quantityId: "sale-price", label: "sale price", value: 400, role: "salePriceValue" },
    ]);
    const percentageContract = buildCalculationContract([percentageUnit]);
    expect(
      validateStructuredCalculationOutput({
        value: calculationOutput({
          steps: [
            { targetQuantity: "discount", expression: "20 / 100 * 500", result: "100", unit: "", sourceLabels: ["SOURCE_1"] },
            { targetQuantity: "sale price", expression: "500 - 100", result: "400", unit: "", sourceLabels: ["SOURCE_1"] },
          ],
          finalQuantity: "sale price",
          finalResult: "400",
        }),
        contract: percentageContract,
        validatedEvidenceUnits: [percentageUnit],
      }).supported
    ).toBe(true);
    expect(
      validateStructuredCalculationOutput({
        value: calculationOutput({
          steps: [{ targetQuantity: "discount", expression: "500 - 400", result: "100", unit: "", sourceLabels: ["SOURCE_1"] }],
          finalQuantity: "discount",
          finalResult: "100",
        }),
        contract: percentageContract,
        validatedEvidenceUnits: [percentageUnit],
      }).supported
    ).toBe(false);

    const interestUnit = bindingUnit([
      { quantityId: "principal", label: "principal", value: 800, role: "principalValue" },
      { quantityId: "rate", label: "rate", value: 6, role: "rateValue" },
      { quantityId: "time", label: "time", value: 2, role: "timeValue" },
      { quantityId: "interest", label: "interest", value: 96, role: "interestValue" },
      { quantityId: "total-amount", label: "total amount", value: 896, role: "totalAmountValue" },
    ]);
    const interestContract = buildCalculationContract([interestUnit]);
    expect(
      validateStructuredCalculationOutput({
        value: calculationOutput({
          steps: [
            { targetQuantity: "interest", expression: "800 * 6 * 2 / 100", result: "96", unit: "", sourceLabels: ["SOURCE_1"] },
            { targetQuantity: "total amount", expression: "800 + 96", result: "896", unit: "", sourceLabels: ["SOURCE_1"] },
          ],
          finalQuantity: "total amount",
          finalResult: "896",
        }),
        contract: interestContract,
        validatedEvidenceUnits: [interestUnit],
      }).supported
    ).toBe(true);
    expect(
      validateStructuredCalculationOutput({
        value: calculationOutput({
          steps: [{ targetQuantity: "interest", expression: "896 - 800", result: "96", unit: "", sourceLabels: ["SOURCE_1"] }],
          finalQuantity: "interest",
          finalResult: "96",
        }),
        contract: interestContract,
        validatedEvidenceUnits: [interestUnit],
      }).supported
    ).toBe(false);

    const unitRateUnit = bindingUnit([
      { quantityId: "price", label: "price", value: 300, role: "priceValue" },
      { quantityId: "quantity", label: "quantity", value: 5, role: "quantityCount" },
      { quantityId: "unit-rate", label: "unit rate", value: 60, role: "unitRateValue" },
    ]);
    expect(
      validateStructuredCalculationOutput({
        value: calculationOutput({
          steps: [{ targetQuantity: "unit rate", expression: "300 / 5", result: "60", unit: "", sourceLabels: ["SOURCE_1"] }],
          finalQuantity: "unit rate",
          finalResult: "60",
        }),
        contract: buildCalculationContract([unitRateUnit]),
        validatedEvidenceUnits: [unitRateUnit],
      }).supported
    ).toBe(true);

    const speedUnit = bindingUnit([
      { quantityId: "distance", label: "distance", value: 120, role: "distanceValue" },
      { quantityId: "time", label: "time", value: 10, role: "timeValue" },
      { quantityId: "speed", label: "speed", value: 12, role: "speedValue" },
    ]);
    expect(
      validateStructuredCalculationOutput({
        value: calculationOutput({
          steps: [{ targetQuantity: "speed", expression: "120 / 10", result: "12", unit: "", sourceLabels: ["SOURCE_1"] }],
          finalQuantity: "speed",
          finalResult: "12",
        }),
        contract: buildCalculationContract([speedUnit], { requestedFinalQuantity: "speed" }),
        validatedEvidenceUnits: [speedUnit],
      }).supported
    ).toBe(true);
    expect(
      validateStructuredCalculationOutput({
        value: calculationOutput({
          steps: [{ targetQuantity: "distance", expression: "12 * 10", result: "120", unit: "", sourceLabels: ["SOURCE_1"] }],
          finalQuantity: "distance",
          finalResult: "120",
        }),
        contract: buildCalculationContract([speedUnit], { requestedFinalQuantity: "distance" }),
        validatedEvidenceUnits: [speedUnit],
      }).supported
    ).toBe(true);
    expect(
      validateStructuredCalculationOutput({
        value: calculationOutput({
          steps: [{ targetQuantity: "distance", expression: "12 * 10", result: "120", unit: "", sourceLabels: ["SOURCE_1"] }],
          finalQuantity: "distance",
          finalResult: "120",
        }),
        contract: buildCalculationContract([speedUnit], { requestedFinalQuantity: "speed" }),
        validatedEvidenceUnits: [speedUnit],
      }).supported
    ).toBe(false);
  });

  it("validates structured formula variables and conditions", () => {
    const { decision } = formulaDecision(
      "The area of a triangle is one half times base times perpendicular height: Area = 1/2 x base x height. The height must meet the base at a right angle."
    );
    const contract = buildFormulaContract(decision.validatedEvidenceUnits);

    expect(contract.requiredVariables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ symbol: "base", meaning: "base" }),
        expect.objectContaining({ symbol: "height", meaning: "perpendicular height" }),
      ])
    );

    expect(
      validateStructuredFormulaOutput({
        value: formulaOutput(),
        contract,
        validatedEvidenceUnits: decision.validatedEvidenceUnits,
      }).supported
    ).toBe(true);

    expect(
      validateStructuredFormulaOutput({
        value: formulaOutput({
          variables: [{ symbol: "base", meaning: "base", sourceLabels: ["SOURCE_1"] }],
        }),
        contract,
        validatedEvidenceUnits: decision.validatedEvidenceUnits,
      }).supported
    ).toBe(false);

    expect(
      validateStructuredFormulaOutput({
        value: formulaOutput({
          variables: [
            { symbol: "b", meaning: "base", sourceLabels: ["SOURCE_1"] },
            { symbol: "h", meaning: "perpendicular height", sourceLabels: ["SOURCE_1"] },
          ],
          expression: "Area = 1/2 * b * h",
        }),
        contract,
        validatedEvidenceUnits: decision.validatedEvidenceUnits,
      }).supported
    ).toBe(false);

    expect(
      validateStructuredFormulaOutput({
        value: formulaOutput({
          variables: [
            { symbol: "base", meaning: "base", sourceLabels: ["SOURCE_1"] },
            { symbol: "height", meaning: "height", sourceLabels: ["SOURCE_1"] },
          ],
        }),
        contract,
        validatedEvidenceUnits: decision.validatedEvidenceUnits,
      }).supported
    ).toBe(false);

    expect(
      validateStructuredFormulaOutput({
        value: formulaOutput({
          conditions: [
            { text: "height is drawn from the opposite vertex to the base", sourceLabels: ["SOURCE_1"] },
          ],
        }),
        contract,
        validatedEvidenceUnits: decision.validatedEvidenceUnits,
      }).supported
    ).toBe(false);
  });

  it("allows evidence-defined b and h without inventing them", () => {
    const { decision } = formulaDecision(
      "The area of a triangle is A = 1/2 x b x h. In this formula, b means base and h means perpendicular height. The height must meet the base at a right angle."
    );
    const contract = buildFormulaContract(decision.validatedEvidenceUnits);
    const result = validateStructuredFormulaOutput({
      value: {
        expression: "A = 1/2 * b * h",
        variables: [
          { symbol: "b", meaning: "base", sourceLabels: ["SOURCE_1"] },
          { symbol: "h", meaning: "perpendicular height", sourceLabels: ["SOURCE_1"] },
        ],
        units: [],
        conditions: [
          { text: "height meets the base at a right angle", sourceLabels: ["SOURCE_1"] },
        ],
        sourceLabels: ["SOURCE_1"],
        suggestedQuestions: [],
      },
      contract,
      validatedEvidenceUnits: decision.validatedEvidenceUnits,
    });

    expect(result.supported).toBe(true);
  });

  it("retains source formula evidence and units for force formula contracts", () => {
    const content =
      "Newton's second law links resultant force, mass and acceleration: F = m x a. Force is measured in newtons when mass is in kilograms and acceleration is in metres per second squared.";
    const capability = extractEvidenceCapability(
      chunk(content, {
        subjectId: "eval-subject-physics",
        topicId: "eval-topic-force",
      })
    );
    const requestRequirements = extractRequestRequirements({
      requestId: "request-1",
      question: "Explain F = m x a and its unit.",
      subjectId: "eval-subject-physics",
      topicId: "eval-topic-force",
    });
    const decision = decideAnswerability({
      requestRequirements,
      evidenceCapabilities: [capability],
      conflicts: [],
    });
    const contract = buildFormulaContract(decision.validatedEvidenceUnits);

    expect(decision.classification).toBe("SUPPORTED");
    expect(decision.validatedEvidenceUnits.map((unit) => unit.quotedEvidence)).toEqual(
      expect.arrayContaining([expect.stringMatching(/F = m x a/i)])
    );
    expect(contract.expressions).toContain("F = m x a");
    expect(validateFormulaContractCompleteness(contract).supported).toBe(true);
    expect(contract.requiredVariables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ symbol: "F", meaning: "force" }),
        expect.objectContaining({ symbol: "m", meaning: "mass" }),
        expect.objectContaining({ symbol: "a", meaning: "acceleration" }),
      ])
    );
    expect(contract.requiredUnits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ quantity: "force", unit: "newtons" }),
        expect.objectContaining({ quantity: "mass", unit: "kilograms" }),
        expect.objectContaining({
          quantity: "acceleration",
          unit: "metres per second squared",
        }),
      ])
    );

    const result = validateStructuredFormulaOutput({
      value: {
        expression: "F = m x a",
        variables: [
          { symbol: "F", meaning: "force", sourceLabels: ["SOURCE_1"] },
          { symbol: "m", meaning: "mass", sourceLabels: ["SOURCE_1"] },
          { symbol: "a", meaning: "acceleration", sourceLabels: ["SOURCE_1"] },
        ],
        units: [
          { quantity: "Force", unit: "newtons", sourceLabels: ["SOURCE_1"] },
          { quantity: "mass", unit: "kilograms", sourceLabels: ["SOURCE_1"] },
          {
            quantity: "acceleration",
            unit: "metres per second squared",
            sourceLabels: ["SOURCE_1"],
          },
        ],
        conditions: [],
        sourceLabels: ["SOURCE_1"],
        suggestedQuestions: [],
      },
      contract,
      validatedEvidenceUnits: decision.validatedEvidenceUnits,
    });
    expect(result.supported).toBe(true);

    expect(
      validateStructuredFormulaOutput({
        value: {
          expression: "F = m x a",
          variables: [
            { symbol: "F", meaning: "force", sourceLabels: ["SOURCE_1"] },
            { symbol: "m", meaning: "mass", sourceLabels: ["SOURCE_1"] },
            { symbol: "a", meaning: "acceleration", sourceLabels: ["SOURCE_1"] },
            { symbol: "d", meaning: "distance", sourceLabels: ["SOURCE_1"] },
          ],
          units: [
            { quantity: "Force", unit: "newtons", sourceLabels: ["SOURCE_1"] },
            { quantity: "mass", unit: "kilograms", sourceLabels: ["SOURCE_1"] },
            {
              quantity: "acceleration",
              unit: "metres per second squared",
              sourceLabels: ["SOURCE_1"],
            },
          ],
          conditions: [],
          sourceLabels: ["SOURCE_1"],
          suggestedQuestions: [],
        },
        contract,
        validatedEvidenceUnits: decision.validatedEvidenceUnits,
      }).supported
    ).toBe(false);
  });

  it("fails formula contract completeness before provider repair when formula evidence is absent", () => {
    const incomplete = {
      expressions: [],
      requiredVariables: [],
      requiredConditions: [],
      requiredUnits: [{ quantity: "force", unit: "newtons", sourceLabels: ["SOURCE_1"] }],
      sourceLabels: ["SOURCE_1"],
    };

    expect(validateFormulaContractCompleteness(incomplete)).toMatchObject({
      supported: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ code: "UNSUPPORTED_EXPRESSION" }),
      ]),
    });
  });

  it("routes formula-only requests to structured formula mode", () => {
    const capability = extractEvidenceCapability(
      chunk("The area of a triangle is Area = 1/2 x base x height.", {
        topicId: geometryTopicId,
      })
    );
    const requestRequirements = extractRequestRequirements({
      requestId: "request-1",
      question: "State the triangle area formula.",
      subjectId,
      topicId: geometryTopicId,
    });
    const decision = decideAnswerability({
      requestRequirements,
      evidenceCapabilities: [capability],
      conflicts: [],
    });
    expect(selectTaskOutputMode({ requestRequirements, answerabilityDecision: decision })).toBe(
      "STRUCTURED_FORMULA"
    );
  });

  it.each([
    {
      question: "Teach me Ohm's law and the units used.",
      subjectId: "eval-subject-physics",
      topicId: "eval-topic-electricity",
      content:
        "Ohm's law states that potential difference equals current times resistance: V = I x R. Voltage is measured in volts, current in amperes, and resistance in ohms.",
      expectedMode: "STRUCTURED_FORMULA",
    },
    {
      question: "Explain F = m x a and its unit.",
      subjectId: "eval-subject-physics",
      topicId: "eval-topic-force",
      content:
        "Force equals mass times acceleration: F = m x a. Force is measured in newtons.",
      expectedMode: "STRUCTURED_FORMULA",
    },
    {
      question: "What is the density formula and units?",
      subjectId,
      topicId: "eval-topic-density",
      content:
        "Density equals mass divided by volume: density = mass / volume. Density is measured in kilograms.",
      expectedMode: "STRUCTURED_FORMULA",
    },
    {
      question: "Teach the triangle area formula and define the variables.",
      subjectId,
      topicId: geometryTopicId,
      content:
        "The area of a triangle is one half times base times perpendicular height: Area = 1/2 x base x height. The height must meet the base at a right angle.",
      expectedMode: "STRUCTURED_FORMULA",
    },
    {
      question: "Using voltage 12 and current 2, calculate power.",
      subjectId: "eval-subject-physics",
      topicId: "eval-topic-electricity",
      content:
        "Power equals voltage times current: power = voltage x current. Voltage is 12 and current is 2, so power is 24.",
      expectedMode: "STRUCTURED_CALCULATION",
    },
    {
      question: "What is the probability of rolling an even number on a fair die?",
      subjectId,
      topicId: "eval-topic-probability",
      content:
        "Probability is favourable outcomes divided by total equally likely outcomes. For a fair six-sided die, the probability of rolling an even number is 3 out of 6, which simplifies to 1/2.",
      expectedMode: "STRUCTURED_CALCULATION",
    },
    {
      question: "What unit is voltage measured in?",
      subjectId: "eval-subject-physics",
      topicId: "eval-topic-electricity",
      content: "Voltage is measured in volts.",
      expectedMode: "GENERAL_PROSE",
    },
    {
      question: "Define voltage.",
      subjectId: "eval-subject-physics",
      topicId: "eval-topic-electricity",
      content: "Voltage is the potential difference between two points.",
      expectedMode: "GENERAL_PROSE",
    },
    {
      question: "Explain electric current.",
      subjectId: "eval-subject-physics",
      topicId: "eval-topic-electricity",
      content: "Electric current is the flow of electric charge.",
      expectedMode: "GENERAL_PROSE",
    },
  ])("selects task output mode from semantic requirements: $question", (item) => {
    const capability = extractEvidenceCapability(
      chunk(item.content, {
        subjectId: item.subjectId,
        topicId: item.topicId,
      })
    );
    const requestRequirements = extractRequestRequirements({
      requestId: "request-1",
      question: item.question,
      subjectId: item.subjectId,
      topicId: item.topicId,
    });
    const decision = decideAnswerability({
      requestRequirements,
      evidenceCapabilities: [capability],
      conflicts: [],
    });

    expect(selectTaskOutputMode({ requestRequirements, answerabilityDecision: decision })).toBe(
      item.expectedMode
    );
  });

  it("serializes strict provider schemas without internal ids", () => {
    const serialized = JSON.stringify([
      structuredCalculationOutputSchema,
      structuredFormulaOutputSchema,
    ]);
    expect(serialized).toContain("capability_structured_calculation_response");
    expect(serialized).toContain("capability_structured_formula_response");
    expect(serialized).not.toContain("requirementId");
    expect(serialized).not.toContain("capabilityId");
    expect(serialized).not.toContain("evidenceUnitId");
    expect(serialized).not.toContain("database");
  });

  it("runs focused provider-free capability cases with fake structured outputs", async () => {
    const cases = [
      {
        question: "Work through the boys to girls ratio example.",
        topicId: ratioTopicId,
        content:
          "Worked ratio example: if boys:girls = 2:3 and boys = 10, then one part is 5, so girls = 15. Always keep the order of the compared quantities.",
        expectedMode: "STRUCTURED_CALCULATION",
        expectedText: "girls = 3 × 5 = 15",
        expectedProviderCalls: 0,
      },
      {
        question: "Teach the triangle area formula and define the variables.",
        topicId: geometryTopicId,
        content:
          "The area of a triangle is one half times base times perpendicular height: Area = 1/2 x base x height. The height must meet the base at a right angle.",
        expectedMode: "STRUCTURED_FORMULA",
        expectedText: "perpendicular height",
        expectedProviderCalls: 1,
      },
      {
        question: "What is the probability of rolling an even number on a fair die?",
        topicId: "eval-topic-probability",
        content:
          "Probability is favourable outcomes divided by total equally likely outcomes. For a fair six-sided die, the probability of rolling an even number is 3 out of 6, which simplifies to 1/2.",
        expectedMode: "STRUCTURED_CALCULATION",
        expectedText: "probability = 3 / 6 = 1/2",
        expectedProviderCalls: 0,
      },
      {
        question: "Explain F = m x a and its unit.",
        topicId: "eval-topic-force",
        subjectId: "eval-subject-physics",
        content:
          "Newton's second law links resultant force, mass and acceleration: F = m x a. Force is measured in newtons when mass is in kilograms and acceleration is in metres per second squared.",
        expectedMode: "STRUCTURED_FORMULA",
        expectedText: "force is measured in newtons",
        expectedProviderCalls: 1,
      },
      {
        question: "What are producers?",
        topicId: "eval-topic-food-chain",
        subjectId: "eval-subject-science",
        content: "Producers are organisms that make their own food.",
        expectedMode: "GENERAL_PROSE",
        expectedText: "Producers are organisms",
        expectedProviderCalls: 1,
      },
      {
        question: "For Mathematics 2021 Question 5, explain the blue counters answer.",
        topicId: ratioTopicId,
        content:
          "Practice paper identifier: Mathematics 2021 Question 5. A club has red and blue counters in the ratio 4:5. If there are 20 red counters, there are 25 blue counters. Answer: 25.",
        expectedMode: "GENERAL_PROSE",
        expectedText: "25 blue",
        expectedProviderCalls: 1,
      },
      {
        question: "Teach the 20 percent discount example.",
        topicId: "eval-topic-percentage",
        content:
          "A 20 percent discount on 500 is 100. Subtract the discount from 500 to get a sale price of 400.",
        expectedMode: "STRUCTURED_CALCULATION",
        expectedText: "400",
        expectedProviderCalls: 0,
      },
      {
        question: "Calculate the simple interest.",
        topicId: "eval-topic-simple-interest",
        content:
          "Simple interest formula: I = P x R x T / 100. For the loan example, P is 600, R is 5 percent, and T is 2 years, so I = 600 x 5 x 2 / 100 = 60.",
        expectedMode: "STRUCTURED_CALCULATION",
        expectedText: "interest = 600 × 5 × 2 / 100 = 60",
        expectedProviderCalls: 0,
      },
      {
        question: "Which crate is better value per bottle?",
        topicId: "eval-topic-unit-rate",
        content:
          "Cost per bottle is total cost divided by bottles. Crate A costs 720 naira for 12 bottles. Crate B costs 500 naira for 5 bottles.",
        expectedMode: "STRUCTURED_CALCULATION",
        expectedText: "better value = crate a",
        expectedProviderCalls: 0,
      },
      {
        question: "Calculate speed from 120 metres in 10 seconds.",
        topicId: "eval-topic-speed",
        content:
          "Speed is distance divided by time. A runner covers 120 metres in 10 seconds, so speed = 120 / 10 = 12 m/s.",
        expectedMode: "STRUCTURED_CALCULATION",
        expectedText: "speed = 120 / 10 = 12",
        expectedProviderCalls: 0,
      },
      {
        question: "Connect voltage, current, and resistance in one formula with units.",
        topicId: "eval-topic-electricity",
        subjectId: "eval-subject-physics",
        content:
          "Ohm's law is V = I x R, where V is voltage, I is current, and R is resistance. Voltage is measured in volts, current in amperes, and resistance in ohms.",
        expectedMode: "STRUCTURED_FORMULA",
        expectedText: "voltage",
        expectedProviderCalls: 1,
      },
    ] as const;

    for (const item of cases) {
      const caseSubjectId = "subjectId" in item ? item.subjectId : undefined;
      const provider = new FakeChatModelProvider();
      const pipeline = new CapabilityGroundingPipeline({
        searchRepository: new StaticSearchRepository([
          retrievedChunk("chunk-1", item.content, {
            subjectId: caseSubjectId ?? subjectId,
            topicId: item.topicId,
          }),
        ]),
        embeddingProvider: noEmbeddingProvider,
      });
      const result = await pipeline.generate({
        provider,
        context: {
          chatId: "chat-1",
          userMessageId: "user-message-1",
          assistantMessageId: "assistant-message-1",
          generationRequestId: `request-${item.question}`,
          attemptNumber: 1,
          userMessage: item.question,
          subjectId: caseSubjectId ?? subjectId,
          subjectName: caseSubjectId === "eval-subject-physics" ? "Physics" : "Mathematics",
          topicId: item.topicId,
          topicTitle: "Topic",
          recentMessages: [],
        },
      });

      expect(result.kind, item.question).toBe("COMPLETED");
      if (result.kind !== "COMPLETED") continue;
      expect(result.diagnostics.taskOutputMode).toBe(item.expectedMode);
      expect(result.content.toLowerCase()).toContain(item.expectedText.toLowerCase());
      expect(provider.invocationCount).toBe(item.expectedProviderCalls);
    }
  });

  it("rejects fake adversarial structured outputs and accepts repaired outputs", async () => {
    const { decision } = ratioDecision();
    const contract = buildCalculationContract(decision.validatedEvidenceUnits);
    expect(
      validateStructuredCalculationOutput({
        value: {
          steps: [{ targetQuantity: "girls", expression: "2 * 5", result: "10", unit: "", sourceLabels: ["SOURCE_1"] }],
          finalQuantity: "girls",
          finalResult: "10",
          finalUnit: "",
          sourceLabels: ["SOURCE_1"],
          suggestedQuestions: [],
        },
        contract,
        validatedEvidenceUnits: decision.validatedEvidenceUnits,
      }).supported
    ).toBe(false);

    const calculationPrompt = buildStructuredCalculationPrompt({
      question: "Work through the boys to girls ratio example.",
      contract,
    });
    const provider = new FakeChatModelProvider();
    const value = await provider.generateStructured({
      messages: calculationPrompt.messages,
      outputSchema: structuredCalculationOutputSchema,
    });
    expect(
      validateStructuredCalculationOutput({
        value: value.value,
        contract,
        validatedEvidenceUnits: decision.validatedEvidenceUnits,
      }).supported
    ).toBe(true);

    const { decision: formulaAnswerability } = formulaDecision(
      "The area of a triangle is one half times base times perpendicular height: Area = 1/2 x base x height. The height must meet the base at a right angle."
    );
    const formulaContract = buildFormulaContract(
      formulaAnswerability.validatedEvidenceUnits
    );
    const formulaPrompt = buildStructuredFormulaPrompt({
      question: "Teach the triangle area formula and define the variables.",
      contract: formulaContract,
    });
    const formulaValue = await provider.generateStructured({
      messages: formulaPrompt.messages,
      outputSchema: structuredFormulaOutputSchema,
    });
    expect(
      validateStructuredFormulaOutput({
        value: formulaValue.value,
        contract: formulaContract,
        validatedEvidenceUnits: formulaAnswerability.validatedEvidenceUnits,
      }).supported
    ).toBe(true);
  });
});
