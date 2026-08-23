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
  renderStructuredCalculationAnswer,
  structuredCalculationOutputSchema,
  structuredFormulaOutputSchema,
  selectTaskOutputMode,
  validateStructuredCalculationOutput,
  validateStructuredFormulaOutput,
} from "./task-output";

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
    expect(rendered).toContain("girls = 3 * 5 = 15");
    expect(rendered).not.toContain("15 / 3");
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
        expectedText: "girls = 3 * 5 = 15",
      },
      {
        question: "Teach the triangle area formula and define the variables.",
        topicId: geometryTopicId,
        content:
          "The area of a triangle is one half times base times perpendicular height: Area = 1/2 x base x height. The height must meet the base at a right angle.",
        expectedMode: "STRUCTURED_FORMULA",
        expectedText: "perpendicular height",
      },
      {
        question: "For Mathematics 2021 Question 5, explain the blue counters answer.",
        topicId: ratioTopicId,
        content:
          "Practice paper identifier: Mathematics 2021 Question 5. A club has red and blue counters in the ratio 4:5. If there are 20 red counters, there are 25 blue counters. Answer: 25.",
        expectedMode: "GENERAL_PROSE",
        expectedText: "25 blue",
      },
      {
        question: "Teach the 20 percent discount example.",
        topicId: "eval-topic-percentage",
        content:
          "A 20 percent discount on 500 is 100. Subtract the discount from 500 to get a sale price of 400.",
        expectedMode: "STRUCTURED_CALCULATION",
        expectedText: "400",
      },
      {
        question: "Connect voltage, current, and resistance in one formula with units.",
        topicId: "eval-topic-electricity",
        subjectId: "eval-subject-physics",
        content:
          "Ohm's law is V = I x R, where V is voltage, I is current, and R is resistance. Voltage is measured in volts, current in amperes, and resistance in ohms.",
        expectedMode: "STRUCTURED_FORMULA",
        expectedText: "voltage",
      },
    ] as const;

    for (const item of cases) {
      const caseSubjectId = "subjectId" in item ? item.subjectId : undefined;
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
        provider: new FakeChatModelProvider(),
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
