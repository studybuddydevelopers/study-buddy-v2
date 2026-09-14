import { describe, expect, it } from "vitest";
import { decideAnswerability } from "./answerability/answerability-decider";
import {
  detectCapabilityConflicts,
  extractEvidenceCapabilities,
} from "./capabilities/evidence-capability-extractor";
import type { AuthorizedEvidenceChunk } from "./capabilities/types";
import { extractRequestRequirements } from "./requirements/request-requirement-extractor";
import {
  buildFormulaContract,
  validateFormulaContractCompleteness,
} from "./task-output";
import type { ValidatedEvidenceUnit } from "./evidence-units/validated-evidence-unit";
import { validateNarrowGroundedOutput } from "./validation/narrow-grounding-validator";

const SUBJECT_ID = "subject-broad-v3-presentation";
const TOPIC_ID = "topic-broad-v3-presentation";

function chunk(
  content: string,
  overrides: Partial<AuthorizedEvidenceChunk> = {}
): AuthorizedEvidenceChunk {
  return {
    resourceChunkId: overrides.resourceChunkId ?? `chunk-${stableId(content)}`,
    sourceLabel: overrides.sourceLabel ?? "SOURCE_1",
    subjectId: overrides.subjectId ?? SUBJECT_ID,
    topicId: overrides.topicId ?? TOPIC_ID,
    title: overrides.title ?? "Broad v3 presentation chunk",
    content,
  };
}

function run(question: string, contents: string[]) {
  const requestRequirements = extractRequestRequirements({
    requestId: "request-broad-v3-presentation",
    question,
    subjectId: SUBJECT_ID,
    topicId: TOPIC_ID,
  });
  const evidenceCapabilities = extractEvidenceCapabilities({
    chunks: contents.map((content, index) =>
      chunk(content, {
        sourceLabel: `SOURCE_${index + 1}`,
        resourceChunkId: `chunk-${index + 1}`,
      })
    ),
  });
  const decision = decideAnswerability({
    requestRequirements,
    evidenceCapabilities,
    conflicts: detectCapabilityConflicts(evidenceCapabilities),
  });
  return { requestRequirements, evidenceCapabilities, decision };
}

function expectSupported(question: string, contents: string[]) {
  const result = run(question, contents);
  expect(result.decision.classification, `${question} <= ${contents.join(" | ")}`).toBe(
    "SUPPORTED"
  );
  expect(result.decision.validatedEvidenceUnits.length).toBeGreaterThan(0);
  return result;
}

function expectInsufficient(question: string, contents: string[]) {
  const result = run(question, contents);
  expect(result.decision.classification, `${question} <= ${contents.join(" | ")}`).toBe(
    "INSUFFICIENT_CONTEXT"
  );
  return result;
}

describe("Stage 4.1 broad-property v3 presentation and provenance alignment", () => {
  it("does not reject supported answers because optional presentation detail is absent", () => {
    expectSupported("Explain density in short bullet points.", [
      "Density is mass per volume.",
    ]);
    expectSupported("Teach evaporation in short bullet points.", [
      "Evaporation happens when particles at a liquid surface gain energy and leave as vapour.",
    ]);
  });

  it("still requires explicitly requested formula variables and conditions", () => {
    const complete = expectSupported("Teach the triangle area formula and define b and h.", [
      "Triangle area formula is A = b x h. In this formula, b means base and h means perpendicular height. The height must meet the base at a right angle.",
    ]);
    const contract = buildFormulaContract(complete.decision.validatedEvidenceUnits, {
      requestRequirements: complete.requestRequirements,
      answerabilityDecision: complete.decision,
      evidenceCapabilities: complete.evidenceCapabilities,
    });
    expect(validateFormulaContractCompleteness(contract).supported).toBe(true);
    expect(contract.requiredVariables.map((item) => item.symbol.toLowerCase())).toEqual(
      expect.arrayContaining(["b", "h"])
    );

    expectInsufficient("Teach the triangle area formula and define b and h.", [
      "Triangle area formula is A = b x h. In this formula, b means base.",
    ]);

    const condition = expectSupported(
      "State the triangle area formula and the height condition.",
      [
        "Triangle area formula is A = b x h. The height must meet the base at a right angle.",
      ]
    );
    const conditionContract = buildFormulaContract(
      condition.decision.validatedEvidenceUnits,
      {
        requestRequirements: condition.requestRequirements,
        answerabilityDecision: condition.decision,
        evidenceCapabilities: condition.evidenceCapabilities,
      }
    );
    expect(
      conditionContract.requiredConditions.map((item) => item.text).join(" ")
    ).toMatch(/right angle|perpendicular/i);
    expectInsufficient("State the triangle area formula and the height condition.", [
      "Triangle area formula is A = b x h.",
    ]);
  });

  it("accepts equivalent source order while preserving concrete authorised source labels", () => {
    const first = expectSupported("What is osmosis?", [
      "Osmosis means movement of water through a partially permeable membrane.",
      "Osmosis is the movement of water through a partially permeable membrane.",
    ]);
    const second = expectSupported("What is osmosis?", [
      "Osmosis is the movement of water through a partially permeable membrane.",
      "Osmosis means movement of water through a partially permeable membrane.",
    ]);

    expect(first.decision.conflictIds).toBeUndefined();
    expect(second.decision.conflictIds).toBeUndefined();
    expect(
      first.decision.validatedEvidenceUnits.every((unit) =>
        /^SOURCE_[12]$/.test(unit.sourceLabel)
      )
    ).toBe(true);
    expect(
      second.decision.validatedEvidenceUnits.every((unit) =>
        /^SOURCE_[12]$/.test(unit.sourceLabel)
      )
    ).toBe(true);
  });

  it("keeps citation validation narrow but strict", () => {
    const result = expectSupported("What is osmosis?", [
      "Osmosis is the movement of water through a partially permeable membrane.",
    ]);

    expect(
      validateNarrowGroundedOutput({
        validatedEvidenceUnits: result.decision.validatedEvidenceUnits,
        value: {
          insufficientContext: false,
          answerSegments: [
            {
              text: "Osmosis is the movement of water through a partially permeable membrane.",
              sourceLabels: ["SOURCE_1"],
            },
          ],
          suggestedQuestions: [],
        },
      }).supported
    ).toBe(true);

    const unknownSource = validateNarrowGroundedOutput({
      validatedEvidenceUnits: result.decision.validatedEvidenceUnits,
      value: {
        insufficientContext: false,
        answerSegments: [
          {
            text: "Osmosis is the movement of water through a partially permeable membrane.",
            sourceLabels: ["SOURCE_2"],
          },
        ],
        suggestedQuestions: [],
      },
    });
    expect(unknownSource.supported).toBe(false);
    expect(unknownSource.errors.map((error) => error.code)).toContain(
      "UNKNOWN_SOURCE_LABEL"
    );

    const formulaOnlyUnit: ValidatedEvidenceUnit = {
      id: "unit-ohm-formula",
      sourceLabel: "SOURCE_1",
      resourceChunkId: "chunk-ohm-formula",
      capabilityIds: ["cap-ohm-formula"],
      supportsRequirementIds: ["req-ohm-formula"],
      quotedEvidence: "Ohm's law is V = I x R.",
      evidenceSpans: [],
      allowedUses: ["FORMULA"],
    };
    const unsupportedSegment = validateNarrowGroundedOutput({
      validatedEvidenceUnits: [formulaOnlyUnit],
      value: {
        insufficientContext: false,
        answerSegments: [
          {
            text: "Ohm's law is V = I x R, and current is directly proportional to voltage.",
            sourceLabels: ["SOURCE_1"],
          },
        ],
        suggestedQuestions: [],
      },
    });
    expect(unsupportedSegment.supported).toBe(false);
    expect(unsupportedSegment.errors.map((error) => error.code)).toContain(
      "UNSUPPORTED_ELABORATION"
    );
  });

  it("keeps provenance scoped to the selected evidence rather than any source label", () => {
    const result = expectSupported("Give the pressure formula.", [
      "Pressure formula is P = F / A.",
      "Density formula is density = mass / volume.",
    ]);
    expect(result.decision.validatedEvidenceUnits.map((unit) => unit.sourceLabel)).toEqual([
      "SOURCE_1",
    ]);
  });
});

function stableId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
