import { describe, expect, it } from "vitest";
import { decideAnswerability } from "./answerability/answerability-decider";
import {
  detectCapabilityConflicts,
  extractEvidenceCapabilities,
} from "./capabilities/evidence-capability-extractor";
import type { AuthorizedEvidenceChunk } from "./capabilities/types";
import { extractRequestRequirements } from "./requirements/request-requirement-extractor";

const subjectId = "pv8-iter2-subject";
const topicId = "pv8-iter2-topic";

function decide(question: string, contents: string[]) {
  const requestRequirements = extractRequestRequirements({
    requestId: question,
    question,
    subjectId,
    topicId,
  });
  const chunks: AuthorizedEvidenceChunk[] = contents.map((content, index) => ({
    resourceChunkId: `iter2-${index}`,
    sourceLabel: `SOURCE_${index + 1}`,
    subjectId,
    topicId,
    content,
  }));
  const evidenceCapabilities = extractEvidenceCapabilities({ chunks });
  return decideAnswerability({
    requestRequirements,
    evidenceCapabilities,
    conflicts: detectCapabilityConflicts(evidenceCapabilities),
  });
}

describe("PV8-2 Iteration 2 specialized role safety", () => {
  it("does not let generic event evidence rescue invalid bounded probability inputs", () => {
    const decision = decide("Find the probability of success.", [
      "Success is a positive outcome. Favourable outcomes are -2. Total outcomes are 5.",
    ]);

    expect(decision.classification).toBe("INSUFFICIENT_CONTEXT");
  });

  it("does not let generic event evidence rescue conflicting bounded probability inputs", () => {
    const decision = decide("Find the probability of success.", [
      "Success is a positive outcome. Favourable outcomes are 2. Total outcomes are 8.",
      "Favourable outcomes are 3.",
    ]);

    expect(decision.classification).toBe("INSUFFICIENT_CONTEXT");
  });

  it("preserves generic event and fact support outside a specialized contract", () => {
    const decision = decide("What happens to evaporation when temperature increases?", [
      "Increasing temperature increases evaporation rate.",
    ]);

    expect(decision.classification).toBe("SUPPORTED");
  });

  it("projects one mixed source to requested option bindings without losing provenance", () => {
    const decision = decide("Which is cheaper per pen, pack A or pack B?", [
      "Pack C costs 1 naira for 100 pens. Pack D costs 2 naira for 100 pens. Pack A costs 480 naira for 12 pens. Pack B costs 450 naira for 9 pens.",
    ]);
    const units = decision.validatedEvidenceUnits;
    const bindings = units.flatMap((unit) => unit.semanticQuantityBindings ?? []);

    expect(decision.classification).toBe("SUPPORTED");
    expect(bindings.filter((binding) => binding.optionScope)).not.toHaveLength(0);
    expect(
      bindings.every(
        (binding) =>
          !binding.optionScope || ["pack a", "pack b"].includes(binding.optionScope)
      )
    ).toBe(true);
    expect(units.every((unit) => unit.resourceChunkId === "iter2-0")).toBe(true);
    expect(units.every((unit) => unit.evidenceSpans.length > 0)).toBe(true);
  });
});
