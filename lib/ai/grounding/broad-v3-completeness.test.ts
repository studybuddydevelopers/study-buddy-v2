import { describe, expect, it } from "vitest";
import { decideAnswerability } from "./answerability/answerability-decider";
import {
  detectCapabilityConflicts,
  extractEvidenceCapabilities,
} from "./capabilities/evidence-capability-extractor";
import type { AuthorizedEvidenceChunk } from "./capabilities/types";
import { extractRequestRequirements } from "./requirements/request-requirement-extractor";

const SUBJECT_ID = "subject-broad-v3-completeness";
const TOPIC_ID = "topic-broad-v3-completeness";

function chunk(
  content: string,
  overrides: Partial<AuthorizedEvidenceChunk> = {}
): AuthorizedEvidenceChunk {
  return {
    resourceChunkId: overrides.resourceChunkId ?? `chunk-${stableId(content)}`,
    sourceLabel: overrides.sourceLabel ?? "SOURCE_1",
    subjectId: overrides.subjectId ?? SUBJECT_ID,
    topicId: overrides.topicId ?? TOPIC_ID,
    title: overrides.title ?? "Broad v3 completeness chunk",
    content,
  };
}

function decide(question: string, contents: string[]) {
  const requestRequirements = extractRequestRequirements({
    requestId: "request-broad-v3-completeness",
    question,
    subjectId: SUBJECT_ID,
    topicId: TOPIC_ID,
  });
  const evidenceCapabilities = extractEvidenceCapabilities({
    chunks: contents.map((content, index) =>
      chunk(content, { sourceLabel: `SOURCE_${index + 1}` })
    ),
  });
  return decideAnswerability({
    requestRequirements,
    evidenceCapabilities,
    conflicts: detectCapabilityConflicts(evidenceCapabilities),
  });
}

function expectSupported(question: string, contents: string[]) {
  const decision = decide(question, contents);
  expect(decision.classification, `${question} <= ${contents.join(" | ")}`).toBe(
    "SUPPORTED"
  );
  expect(decision.validatedEvidenceUnits.length).toBeGreaterThan(0);
  return decision;
}

function expectInsufficient(question: string, contents: string[]) {
  const decision = decide(question, contents);
  expect(decision.classification, `${question} <= ${contents.join(" | ")}`).toBe(
    "INSUFFICIENT_CONTEXT"
  );
  return decision;
}

describe("Stage 4.1 broad-property v3 answerability completeness", () => {
  it("supports restored semantic facets without accepting removed required facets", () => {
    expectSupported("Give density and its unit.", [
      "Density is mass per volume. Density is measured in kilograms per cubic metre.",
    ]);
    expectInsufficient("Give density and its unit.", [
      "Density is mass per volume.",
    ]);
    expectSupported("Give density and its unit.", [
      "Density is mass per volume. The unit used for density is kg/m3.",
    ]);

    expectSupported("State the triangle area formula and the height condition.", [
      "Triangle area formula is A = b x h. The height must meet the base at a right angle.",
    ]);
    expectInsufficient("State the triangle area formula and the height condition.", [
      "Triangle area formula is A = b x h.",
    ]);
    expectSupported("State the triangle area formula and the height condition.", [
      "Triangle area formula is A = b x h. The formula is valid when h is perpendicular to the base.",
    ]);

    expectSupported("Give the pressure formula and define P and A.", [
      "P = F / A. P means pressure and A means area.",
    ]);
    expectInsufficient("Give the pressure formula and define P and A.", [
      "P = F / A. P means pressure.",
    ]);
    expectSupported("Give the pressure formula and define P and A.", [
      "P = F / A. In this formula, P represents pressure and A represents area.",
    ]);
  });

  it("keeps method and process completeness separate from generic definitions", () => {
    expectSupported("How do I find the mean?", [
      "To find the mean, add all values and divide by the number of values.",
    ]);
    expectInsufficient("How do I find the mean?", [
      "The mean is also called the average.",
    ]);
    expectSupported("How do I find the mean?", [
      "The arithmetic mean is found by adding the values, then dividing by how many values there are.",
    ]);

    expectSupported("Explain the process of evaporation.", [
      "Evaporation is the process where a liquid changes into vapour at the surface.",
    ]);
    expectInsufficient("Explain the process of evaporation.", [
      "Evaporation is a change of state.",
    ]);
    expectSupported("Explain the process of evaporation.", [
      "Evaporation happens when particles at a liquid surface gain energy and leave as vapour.",
    ]);
  });

  it("requires every explicit part of a multi-part request", () => {
    expectSupported("Define a noun and give the kinds mentioned.", [
      "A noun names a person, place, thing, or idea. Nouns can be common or proper.",
    ]);
    expectInsufficient("Define a noun and give the kinds mentioned.", [
      "A noun names a person, place, thing, or idea.",
    ]);

    expectSupported("Compare conduction and convection.", [
      "Conduction transfers heat through direct contact. Convection transfers heat by fluid movement.",
    ]);
    expectInsufficient("Compare conduction and convection.", [
      "Conduction transfers heat through direct contact.",
    ]);
  });

  it("does not turn presentation wording into mandatory semantic support", () => {
    expectSupported("Explain density clearly with short bullet points.", [
      "Density is mass per volume.",
    ]);
    expectSupported("Teach osmosis in a friendly way.", [
      "Osmosis is the movement of water through a partially permeable membrane.",
    ]);
  });

  it("keeps optional surrounding facts from creating false completeness requirements", () => {
    expectSupported("Explain photosynthesis.", [
      "Photosynthesis is the process by which green plants use light energy to make glucose.",
    ]);
    expectInsufficient("Explain photosynthesis and its inputs.", [
      "Photosynthesis is an important plant process.",
    ]);
    expectSupported("Explain photosynthesis and its inputs.", [
      "Photosynthesis uses light energy, carbon dioxide, and water to make glucose.",
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
