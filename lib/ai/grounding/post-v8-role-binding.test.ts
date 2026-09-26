import { describe, expect, it } from "vitest";
import { decideAnswerability } from "./answerability/answerability-decider";
import { detectCapabilityConflicts, extractEvidenceCapabilities } from "./capabilities/evidence-capability-extractor";
import type { AuthorizedEvidenceChunk } from "./capabilities/types";
import { executeCalculationPlan } from "./calculation/deterministic-calculation-executor";
import { extractRequestRequirements } from "./requirements/request-requirement-extractor";
import { buildCalculationContract } from "./task-output";

const subjectId = "pv8-role-subject";
const topicId = "pv8-role-topic";

function run(question: string, contents: string[]) {
  const requestRequirements = extractRequestRequirements({ requestId: question, question, subjectId, topicId });
  const chunks: AuthorizedEvidenceChunk[] = contents.map((content, index) => ({
    resourceChunkId: `role-${index}-${content.length}`,
    sourceLabel: `SOURCE_${index + 1}`,
    subjectId,
    topicId,
    content,
  }));
  const evidenceCapabilities = extractEvidenceCapabilities({ chunks });
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
  const execution = decision.classification === "SUPPORTED" && contract.authorisedMethods.length
    ? executeCalculationPlan(contract)
    : undefined;
  return { decision, contract, execution, evidenceCapabilities };
}

type Case = { id: string; question: string; evidence: string[]; supported: boolean; result?: number; winner?: string };

const probabilityCases: Case[] = [
  { id: "p01-labelled", question: "Find the probability of success.", evidence: ["Favourable outcomes are 3. Total outcomes are 8."], supported: true, result: 3 / 8 },
  { id: "p02-reversed-order", question: "Find the chance of success.", evidence: ["Total outcomes are 9. Favourable outcomes are 4."], supported: true, result: 4 / 9 },
  { id: "p03-possible-wording", question: "What is the likelihood of success?", evidence: ["The number of possible outcomes is 10. The number of favourable outcomes is 2."], supported: true, result: 0.2 },
  { id: "p04-out-of", question: "What is the probability of selecting green?", evidence: ["The probability of selecting green is 5 out of 12."], supported: true, result: 5 / 12 },
  { id: "p05-multi-chunk", question: "Find the probability of success.", evidence: ["Favourable outcome count is 6.", "Total outcome count is 15."], supported: true, result: 0.4 },
  { id: "p06-duplicate-equivalent", question: "Find the probability of success.", evidence: ["Favourable outcomes are 3. Total outcomes are 6.", "Possible outcomes are 6. Favourable outcome count is 3."], supported: true, result: 0.5 },
  { id: "p07-missing-favourable", question: "Find the probability of success.", evidence: ["Total outcomes are 8."], supported: false },
  { id: "p08-missing-total", question: "Find the probability of success.", evidence: ["Favourable outcomes are 3."], supported: false },
  { id: "p09-zero-total", question: "Find the probability of success.", evidence: ["Favourable outcomes are 0. Total outcomes are 0."], supported: false },
  { id: "p10-negative-total", question: "Find the probability of success.", evidence: ["Favourable outcomes are 2. Total outcomes are -5."], supported: false },
  { id: "p11-negative-favourable", question: "Find the probability of success.", evidence: ["Favourable outcomes are -2. Total outcomes are 5."], supported: false },
  { id: "p12-favourable-over-total", question: "Find the probability of success.", evidence: ["Favourable outcomes are 8. Total outcomes are 5."], supported: false },
  { id: "p13-conflicting-favourable", question: "Find the probability of success.", evidence: ["Favourable outcomes are 2. Total outcomes are 8.", "Favourable outcomes are 3."], supported: false },
  { id: "p14-conflicting-total", question: "Find the probability of success.", evidence: ["Favourable outcomes are 2. Total outcomes are 8.", "Total outcomes are 9."], supported: false },
  { id: "p15-unlabelled", question: "Find the probability of success.", evidence: ["The two values are 2 and 8."], supported: false },
  { id: "p16-enumeration", question: "List the favourable outcomes and infer the probability of success.", evidence: ["The sample space contains eight items."], supported: false },
  { id: "p17-conditional", question: "Find the conditional probability of success given a prior win.", evidence: ["Favourable outcomes are 2. Total outcomes are 8."], supported: false },
  { id: "p18-combinatorial", question: "Find the probability using combinations of three selections.", evidence: ["Favourable outcomes are 2. Total outcomes are 8."], supported: false },
];

const complete = (aCost = 480, aCount = 12, bCost = 450, bCount = 9) =>
  `Pack A costs ${aCost} naira for ${aCount} pens. Pack B costs ${bCost} naira for ${bCount} pens.`;
const multiCases: Case[] = [
  { id: "m01-basic", question: "Which is cheaper per pen, pack A or pack B?", evidence: [complete()], supported: true, winner: "pack a" },
  { id: "m02-reordered", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack B costs 450 naira for 9 pens. Pack A costs 480 naira for 12 pens."], supported: true, winner: "pack a" },
  { id: "m03-request-order", question: "Which is cheaper per pen, pack B or pack A?", evidence: [complete()], supported: true, winner: "pack a" },
  { id: "m04-multi-chunk", question: "Choose the cheaper per pen: pack A or pack B.", evidence: ["Pack A costs 480 naira for 12 pens.", "Pack B costs 450 naira for 9 pens."], supported: true, winner: "pack a" },
  { id: "m05-irrelevant-c", question: "Which is cheaper per pen, pack A or pack B?", evidence: [complete(), "Pack C costs 1 naira for 100 pens."], supported: true, winner: "pack a" },
  { id: "m06-duplicate", question: "Which is cheaper per pen, pack A or pack B?", evidence: [complete(), complete()], supported: true, winner: "pack a" },
  { id: "m07-different-values", question: "Which is cheaper per pen, pack A or pack B?", evidence: [complete(600, 10, 420, 14)], supported: true, winner: "pack b" },
  { id: "m08-decimals", question: "Which is cheaper per pen, pack A or pack B?", evidence: [complete(15, 3, 24, 4)], supported: true, winner: "pack a" },
  { id: "m09-missing-a-price", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack A contains 12 pens. Pack B costs 450 naira for 9 pens."], supported: false },
  { id: "m10-missing-a-count", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack A costs 480 naira. Pack B costs 450 naira for 9 pens."], supported: false },
  { id: "m11-missing-b-price", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack A costs 480 naira for 12 pens. Pack B contains 9 pens."], supported: false },
  { id: "m12-missing-b-count", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack A costs 480 naira for 12 pens. Pack B costs 450 naira."], supported: false },
  { id: "m13-b-absent", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack A costs 480 naira for 12 pens."], supported: false },
  { id: "m14-cross-price", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack A costs 480 naira. Pack B contains 9 pens."], supported: false },
  { id: "m15-cross-count", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack A contains 12 pens. Pack B costs 450 naira."], supported: false },
  { id: "m16-unlabelled", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["The costs are 480 and 450; the counts are 12 and 9."], supported: false },
  { id: "m17-reference-only", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack A is better value than pack B."], supported: false },
  { id: "m18-reference-missing-side", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack A costs 480 naira for 12 pens. Pack A is better value."], supported: false },
  { id: "m19-zero-a", question: "Which is cheaper per pen, pack A or pack B?", evidence: [complete(480, 0, 450, 9)], supported: false },
  { id: "m20-zero-b", question: "Which is cheaper per pen, pack A or pack B?", evidence: [complete(480, 12, 450, 0)], supported: false },
  { id: "m21-wrong-options", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack C costs 300 naira for 10 pens. Pack D costs 200 naira for 5 pens."], supported: false },
  { id: "m22-one-complete-one-partial", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack A costs 480 naira for 12 pens. Pack B costs 450 naira."], supported: false },
  { id: "m23-extra-before", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack C costs 1 naira for 100 pens. " + complete()], supported: true, winner: "pack a" },
  { id: "m24-extra-between", question: "Which is cheaper per pen, pack A or pack B?", evidence: ["Pack A costs 480 naira for 12 pens. Pack C costs 1 naira for 100 pens. Pack B costs 450 naira for 9 pens."], supported: true, winner: "pack a" },
];

describe("PV8-2 typed role binding", () => {
  it.each(probabilityCases)("probability $id", ({ question, evidence, supported, result }) => {
    const actual = run(question, evidence);
    expect(actual.decision.classification).toBe(supported ? "SUPPORTED" : "INSUFFICIENT_CONTEXT");
    if (supported) {
      expect(actual.execution?.ok).toBe(true);
      expect(actual.execution?.ok && actual.execution.trace.finalResult).toBeCloseTo(result!);
      const method = actual.contract.authorisedMethods.find((item) => item.outputQuantityKey === "probability");
      expect(method?.operation).toBe("/");
    }
  });

  it.each(multiCases)("multi-option $id", ({ question, evidence, supported, winner }) => {
    const actual = run(question, evidence);
    expect(actual.decision.classification).toBe(supported ? "SUPPORTED" : "INSUFFICIENT_CONTEXT");
    if (supported) {
      expect(actual.execution?.ok).toBe(true);
      expect(actual.execution?.ok && actual.execution.trace.comparisonResult?.result.toLowerCase()).toBe(winner);
      const selected = actual.decision.validatedEvidenceUnits.flatMap((unit) => unit.semanticQuantityBindings ?? []);
      expect(selected.every((binding) => !binding.optionScope || ["pack a", "pack b"].includes(binding.optionScope))).toBe(true);
    }
  });
});
