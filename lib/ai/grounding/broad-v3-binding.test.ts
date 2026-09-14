import { describe, expect, it } from "vitest";
import { decideAnswerability } from "./answerability/answerability-decider";
import {
  detectCapabilityConflicts,
  extractEvidenceCapabilities,
} from "./capabilities/evidence-capability-extractor";
import type { AuthorizedEvidenceChunk } from "./capabilities/types";
import { executeCalculationPlan } from "./calculation/deterministic-calculation-executor";
import { extractRequestRequirements } from "./requirements/request-requirement-extractor";
import { buildCalculationContract } from "./task-output";

const SUBJECT_ID = "subject-broad-v3-binding";
const TOPIC_ID = "topic-broad-v3-binding";

function chunk(
  content: string,
  overrides: Partial<AuthorizedEvidenceChunk> = {}
): AuthorizedEvidenceChunk {
  return {
    resourceChunkId: overrides.resourceChunkId ?? `chunk-${stableId(content)}`,
    sourceLabel: overrides.sourceLabel ?? "SOURCE_1",
    subjectId: overrides.subjectId ?? SUBJECT_ID,
    topicId: overrides.topicId ?? TOPIC_ID,
    title: overrides.title ?? "Broad v3 binding chunk",
    content,
  };
}

function run(question: string, contents: string[]) {
  const requestRequirements = extractRequestRequirements({
    requestId: "request-broad-v3-binding",
    question,
    subjectId: SUBJECT_ID,
    topicId: TOPIC_ID,
  });
  const evidenceCapabilities = extractEvidenceCapabilities({
    chunks: contents.map((content, index) =>
      chunk(content, { sourceLabel: `SOURCE_${index + 1}` })
    ),
  });
  const decision = decideAnswerability({
    requestRequirements,
    evidenceCapabilities,
    conflicts: detectCapabilityConflicts(evidenceCapabilities),
  });
  const contract = buildCalculationContract(decision.validatedEvidenceUnits, {
    requestRequirements,
    answerabilityDecision: decision,
    evidenceCapabilities,
  });
  const execution =
    decision.classification === "SUPPORTED" &&
    contract.authorisedMethods.length > 0
      ? executeCalculationPlan(contract)
      : undefined;
  return { requestRequirements, evidenceCapabilities, decision, contract, execution };
}

function expectSupportedCalculation(question: string, contents: string[]) {
  const result = run(question, contents);
  expect(result.decision.classification, `${question} <= ${contents.join(" | ")}`).toBe(
    "SUPPORTED"
  );
  expect(result.contract.authorisedMethods.length).toBeGreaterThan(0);
  expect(result.execution?.ok).toBe(true);
  return result;
}

function expectInsufficient(question: string, contents: string[]) {
  const result = run(question, contents);
  expect(result.decision.classification, `${question} <= ${contents.join(" | ")}`).toBe(
    "INSUFFICIENT_CONTEXT"
  );
  return result;
}

describe("Stage 4.1 broad-property v3 calculation and probability role binding", () => {
  it("binds bounded probability roles across wording variants", () => {
    for (const evidence of [
      "Probability is favourable outcomes divided by total outcomes. For blue, favourable outcomes are 3 and total outcomes are 6.",
      "Chance of blue is 3 out of 6.",
      "Probability = favourable outcomes / total outcomes. The number of favourable outcomes is 3. The number of possible outcomes is 6.",
    ]) {
      const result = expectSupportedCalculation("Find the probability of blue.", [evidence]);
      expect(result.contract.authorisedMethods[0]).toMatchObject({
        outputQuantityKey: "probability",
        operation: "/",
      });
      expect(result.execution?.ok && result.execution.trace.finalResult).toBe(0.5);
    }
  });

  it("refuses bounded probability when a required role is missing or invalid", () => {
    expectInsufficient("Find the probability of blue.", [
      "Probability is favourable outcomes divided by total outcomes. For blue, favourable outcomes are 3.",
    ]);
    expectInsufficient("Find the probability of blue.", [
      "Probability is favourable outcomes divided by total outcomes. For blue, favourable outcomes are 3 and total outcomes are 0.",
    ]);
  });

  it("binds direct division and substitution by semantic quantity, not position", () => {
    const density = expectSupportedCalculation("Calculate density from mass and volume.", [
      "Density is mass divided by volume: density = mass / volume. The volume is 2 m3. The mass is 10 kg.",
    ]);
    expect(density.execution?.ok && density.execution.trace.finalResult).toBe(5);

    const force = expectSupportedCalculation("Calculate force from mass and acceleration.", [
      "Force is found using F = m x a. Acceleration is 4 m/s2. Mass is 3 kg.",
    ]);
    expect(force.execution?.ok && force.execution.trace.finalResult).toBe(12);
  });

  it("keeps ratio method support distinct from numeric ratio calculation", () => {
    const method = run("How do I make equivalent ratios?", [
      "Equivalent ratios are made by multiplying both terms by the same non-zero number.",
    ]);
    expect(method.decision.classification).toBe("SUPPORTED");
    expect(method.contract.authorisedMethods).toEqual([]);

    const workedRatio = expectSupportedCalculation("Work through the boys to girls ratio example.", [
      "Worked ratio example: if boys:girls = 2:3 and boys = 10, then one part is 5, so girls = 15. Keep the compared quantities in order.",
    ]);
    expect(workedRatio.contract.calculationPlan.finalTargetKey).toContain("girls");
    expect(workedRatio.execution?.ok && workedRatio.execution.trace.finalResult).toBe(15);
  });

  it("binds option-scoped unit-rate calculations without cross-option leakage", () => {
    const unitRate = expectSupportedCalculation("Which pack is cheaper per pen?", [
      "Unit cost is found by dividing total cost by number of items. Pack R costs 600 naira for 12 pens. Pack S costs 540 naira for 9 pens.",
    ]);
    expect(unitRate.contract.calculationPlan.comparison).toMatchObject({
      kind: "LOWER_IS_BETTER",
    });
    expect(
      unitRate.execution?.ok &&
        unitRate.execution.trace.comparisonResult?.result.toLowerCase()
    ).toBe("pack r");

    expectInsufficient("Which pack is cheaper per pen?", [
      "Unit cost is found by dividing total cost by number of items. Pack R costs 600 naira for 12 pens. Pack S costs 540 naira.",
    ]);
  });

  it("does not create deterministic plans from bare explanatory text", () => {
    const result = run("Calculate density from mass and volume.", [
      "Density compares how much mass is in a volume.",
    ]);
    expect(result.decision.classification).toBe("INSUFFICIENT_CONTEXT");
    expect(result.contract.authorisedMethods).toEqual([]);
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
