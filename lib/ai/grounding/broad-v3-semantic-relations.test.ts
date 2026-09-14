import { describe, expect, it } from "vitest";
import { decideAnswerability } from "./answerability/answerability-decider";
import {
  detectCapabilityConflicts,
  extractEvidenceCapabilities,
} from "./capabilities/evidence-capability-extractor";
import type { AuthorizedEvidenceChunk } from "./capabilities/types";
import {
  formulaContextKey,
  relationKindsCompatible,
} from "./semantic-relations";
import { extractRequestRequirements } from "./requirements/request-requirement-extractor";

const SUBJECT_ID = "subject-broad-v3-relations";
const TOPIC_ID = "topic-broad-v3-relations";

function chunk(
  content: string,
  overrides: Partial<AuthorizedEvidenceChunk> = {}
): AuthorizedEvidenceChunk {
  return {
    resourceChunkId: overrides.resourceChunkId ?? `chunk-${stableId(content)}`,
    sourceLabel: overrides.sourceLabel ?? "SOURCE_1",
    subjectId: overrides.subjectId ?? SUBJECT_ID,
    topicId: overrides.topicId ?? TOPIC_ID,
    title: overrides.title ?? "Broad v3 relation control chunk",
    content,
  };
}

function run(question: string, chunks: AuthorizedEvidenceChunk[]) {
  const requestRequirements = extractRequestRequirements({
    requestId: "request-broad-v3-relations",
    question,
    subjectId: SUBJECT_ID,
    topicId: TOPIC_ID,
  });
  const evidenceCapabilities = extractEvidenceCapabilities({ chunks });
  const decision = decideAnswerability({
    requestRequirements,
    evidenceCapabilities,
    conflicts: detectCapabilityConflicts(evidenceCapabilities),
  });
  return { requestRequirements, evidenceCapabilities, decision };
}

function expectSupported(question: string, content: string) {
  const result = run(question, [chunk(content)]);
  expect(result.decision.classification, `${question} <= ${content}`).toBe("SUPPORTED");
  return result;
}

function expectInsufficient(question: string, content: string) {
  const result = run(question, [chunk(content)]);
  expect(result.decision.classification, `${question} <= ${content}`).toBe(
    "INSUFFICIENT_CONTEXT"
  );
  return result;
}

describe("Stage 4.1 broad-property v3 semantic relation normalization", () => {
  it("defines typed relation-kind compatibility without making generic facts universal", () => {
    expect(relationKindsCompatible("GENERAL_EXPLANATION", "GENERAL_EXPLANATION")).toBe(true);
    expect(relationKindsCompatible("GENERAL_EXPLANATION", "PROCESS_EXPLANATION")).toBe(false);
    expect(relationKindsCompatible("PROCESS_EXPLANATION", "PROCESS_EXPLANATION")).toBe(true);
    expect(relationKindsCompatible("PROCESS_EXPLANATION", "GENERAL_EXPLANATION")).toBe(false);
    expect(relationKindsCompatible("UNIT", "FORMULA")).toBe(false);
    expect(formulaContextKey("P = F / A")).toBe("p=f/a");
    expect(formulaContextKey("P equals F divided by A")).toBe("p=f/a");
  });

  it.each([
    "Osmosis: movement of water through a partially permeable membrane.",
    "Osmosis means movement of water through a partially permeable membrane.",
    "Osmosis is the movement of water through a partially permeable membrane.",
  ])("matches definition evidence variants: %s", (content) => {
    for (const question of [
      "What is osmosis?",
      "Explain osmosis.",
      "Give the meaning of osmosis.",
    ]) {
      expectSupported(question, content);
    }
  });

  it.each([
    "Photosynthesis is the process by which green plants use light energy to make glucose.",
    "Photosynthesis uses light energy to make glucose in green plants.",
    "Photosynthesis happens when green plants use light energy to make glucose.",
  ])("matches process evidence variants: %s", (content) => {
    for (const question of [
      "Explain the process of photosynthesis.",
      "How does photosynthesis happen?",
      "Describe the photosynthesis process.",
    ]) {
      expectSupported(question, content);
    }
  });

  it.each([
    "Equivalent ratios are made by multiplying both terms by the same non-zero number.",
    "To make an equivalent ratio, multiply or divide both parts by the same non-zero number.",
    "Equivalent ratio method: scale both terms by the same factor.",
  ])("matches method evidence variants: %s", (content) => {
    for (const question of [
      "How do I make equivalent ratios?",
      "What method makes an equivalent ratio?",
      "Explain the steps for equivalent ratios.",
    ]) {
      expectSupported(question, content);
    }
  });

  it.each([
    "Pressure formula is P = F / A.",
    "Pressure equals force divided by area.",
    "The pressure relation is P = F ÷ A.",
  ])("matches formula evidence variants: %s", (content) => {
    for (const question of [
      "What is the formula for pressure?",
      "State the pressure formula.",
      "Give the pressure relation.",
    ]) {
      expectSupported(question, content);
    }
  });

  it.each([
    "P = F / A, where P is pressure, F is force, and A is area.",
    "P = F / A. In this formula, P means pressure, F means force, and A means area.",
    "P = F / A. P represents pressure. F represents force. A represents area.",
  ])("matches same-formula symbol variants: %s", (content) => {
    for (const question of [
      "Give the pressure formula and define P.",
      "In P = F / A, what does F mean?",
      "What do P, F and A mean in P = F / A?",
    ]) {
      expectSupported(question, content);
    }
  });

  it.each([
    "Density is measured in grams per cubic centimetre.",
    "The unit used for density is kg/m3.",
    "Density has units g/cm3.",
  ])("matches unit evidence variants: %s", (content) => {
    for (const question of [
      "What unit is density measured in?",
      "Give the unit of density.",
      "Explain density and its unit.",
    ]) {
      expectSupported(question, content);
    }
  });

  it.each([
    "Triangle area formula is A = b x h. The height must meet the base at a right angle.",
    "Triangle area formula is A = b x h. The perpendicular height is used, not a slanted side.",
    "Triangle area formula is A = b x h. The formula is valid when h is perpendicular to the base.",
  ])("matches condition evidence variants: %s", (content) => {
    for (const question of [
      "State the condition for the triangle area formula.",
      "When is the triangle area formula valid?",
      "What condition applies to h in triangle area?",
    ]) {
      expectSupported(question, content);
    }
  });

  it("matches ratio-method and multi-option unit-rate relation families", () => {
    expectSupported(
      "How do I simplify a ratio?",
      "Simplifying a ratio means dividing both terms by their highest common factor."
    );
    expectSupported(
      "How do I make equivalent ratios?",
      "Equivalent ratios are made by multiplying or dividing both terms by the same non-zero number."
    );
    expectSupported(
      "Which pack is cheaper per pen?",
      "Unit cost is found by dividing total cost by number of items. Pack R costs 600 naira for 12 pens. Pack S costs 450 naira for 9 pens."
    );
  });

  it("keeps wrong-scope unit, condition, and symbol relations unsupported", () => {
    expectInsufficient(
      "What unit is density measured in?",
      "Speed is measured in metres per second."
    );
    expectInsufficient(
      "State the condition for the triangle area formula.",
      "The circle area formula is valid when r is the radius."
    );
    expectInsufficient(
      "In R = V / I, what does R mean?",
      "A = pi r^2, where r is radius."
    );
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
