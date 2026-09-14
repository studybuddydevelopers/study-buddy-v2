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
      "Tell me the meaning of osmosis. Please answer from the note.",
      "Tell me the meaning of osmosis. Explain simply.",
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
    expectSupported(
      "Which option has the lower cost per item, option A or option B?",
      "Unit cost is found by dividing total cost by number of items. Option A costs 600 naira for 12 pens. Option B costs 450 naira for 9 pens."
    );
  });

  it("matches formula symbol unit requirements through compact unit evidence", () => {
    for (const content of [
      "Ohm's law is V = I x R. V is measured in volts, I in amperes, and R in ohms.",
      "For V = I x R: voltage uses volts; current uses amperes; resistance uses ohms.",
      "In Ohm's law, the unit of V is volt, the unit of I is ampere, and the unit of R is ohm.",
    ]) {
      for (const question of [
        "What units are used for V, I, and R in Ohm's law?",
        "Give the units for voltage, current, and resistance in V = I x R.",
        "State the units of each quantity in Ohm's law.",
      ]) {
        expectSupported(question, content);
      }
    }
  });

  it("matches compound and SI unit lookup variants without requiring a definition", () => {
    for (const content of [
      "Density is measured in kilogram per cubic metre, written as kg/m^3.",
      "The SI unit of density is kg m^-3, meaning kilograms per cubic metre.",
      "- Density unit: kg/m3, kilograms per cubic metre.",
    ]) {
      for (const question of [
        "What compound unit is used for density?",
        "State the SI unit for density.",
        "Give density's unit in kilograms and metres.",
      ]) {
        expectSupported(question, content);
      }
    }
  });

  it("matches triangle area formula and height-condition variants", () => {
    for (const content of [
      "Triangle area is 1/2 x base x height. The height must be perpendicular to the base.",
      "Use A = 1/2bh for triangle area, where h is the perpendicular height, not a slanted side.",
      "Study note. Area of a triangle: one half times base times perpendicular height.",
    ]) {
      for (const question of [
        "State the triangle area formula and the height condition.",
        "When using triangle area, what kind of height is required?",
        "Give the triangle area equation and explain the height rule.",
      ]) {
        expectSupported(question, content);
      }
    }
  });

  it("matches ratio allocation evidence without swapping semantic roles", () => {
    for (const content of [
      "For boys:girls = 2:3 and total learners 25, total parts are 5. Boys use 2 parts and girls use 3 parts.",
      "Ratio method: add 2 + 3 = 5 parts. With 25 learners, boys are 2 parts and girls are 3 parts.",
      "- Boys:girls is 2:3. The total is 25 learners. One share is found from 25 divided by 5, then multiply by each labelled part.",
    ]) {
      for (const question of [
        "Use the ratio boys:girls = 2:3 to share 25 learners.",
        "For boys to girls in the ratio 2 to 3, find each group from 25 learners.",
        "Work out boys and girls if 25 learners are split in ratio 2:3.",
      ]) {
        expectSupported(question, content);
      }
    }
  });

  it("matches bounded probability count variants and keeps missing-count cases refused", () => {
    for (const content of [
      "Probability of rolling even is 3 out of 6.",
      "A fair die has 6 outcomes and 3 are even. Probability is favourable outcomes divided by total outcomes.",
      "- For rolling even, favourable outcomes are 3 and total outcomes are 6. Probability uses favourable divided by total.",
    ]) {
      for (const question of [
        "What is the probability of rolling an even number?",
        "Find the chance of rolling even on a fair die.",
        "Calculate the probability for rolling an even number.",
      ]) {
        expectSupported(question, content);
      }
    }

    expectInsufficient(
      "What is the probability of rolling an even number?",
      "For rolling even, favourable outcomes are 3. The total count is not given."
    );
    expectInsufficient(
      "What is the probability of rolling an even number?",
      "Probability is favourable outcomes divided by total outcomes."
    );
  });

  it("matches formula-symbol presentation variants through canonical symbol support", () => {
    for (const content of [
      "P = F / A, where P means pressure and A means area.",
      "Pressure formula is P = F / A. P represents pressure. A represents area.",
      "For pressure, P = F / A. In this equation P means pressure and A means area.",
    ]) {
      for (const question of [
        "Give the pressure formula and define P and A.",
        "State P = F / A and explain P and A.",
        "Define P and A in the pressure formula.",
      ]) {
        expectSupported(question, content);
      }
    }
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
