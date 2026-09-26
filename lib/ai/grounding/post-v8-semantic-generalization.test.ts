import { describe, expect, it } from "vitest";
import { decideAnswerability } from "./answerability/answerability-decider";
import { extractEvidenceCapabilities } from "./capabilities/evidence-capability-extractor";
import type { AuthorizedEvidenceChunk } from "./capabilities/types";
import { extractRequestRequirements } from "./requirements/request-requirement-extractor";
import type { RequestContextMessage } from "./requirements/types";

const SUBJECT_ID = "post-v8-semantic-subject";
const TOPIC_ID = "post-v8-semantic-topic";

function chunk(content: string): AuthorizedEvidenceChunk {
  return {
    resourceChunkId: `chunk-${stableHash(content)}`,
    sourceLabel: "SOURCE_1",
    subjectId: SUBJECT_ID,
    topicId: TOPIC_ID,
    title: "Disclosed semantic matrix card",
    content,
  };
}

function classification(
  question: string,
  content: string,
  recentMessages: RequestContextMessage[] = []
) {
  const requestRequirements = extractRequestRequirements({
    requestId: `request-${stableHash(question)}`,
    question,
    subjectId: SUBJECT_ID,
    topicId: TOPIC_ID,
    recentMessages,
  });
  return decideAnswerability({
    requestRequirements,
    evidenceCapabilities: extractEvidenceCapabilities({ chunks: [chunk(content)] }),
  }).classification;
}

const matrices = [
  {
    family: "definition",
    requests: [
      "Give a general explanation of diffusion.",
      "What do we mean by diffusion?",
      "Describe diffusion in ordinary terms.",
    ],
    resources: [
      "Diffusion is the net movement of particles from higher concentration to lower concentration.",
      "Diffusion: particles spread from a region where they are more concentrated to one where they are less concentrated.",
      "DIFFUSION\nThis term means the overall movement of particles down a concentration difference.",
    ],
  },
  {
    family: "process",
    requests: [
      "Explain how condensation takes place.",
      "Describe the process involved in condensation.",
      "What happens during condensation?",
    ],
    resources: [
      "Condensation is the process by which a gas changes into a liquid after cooling.",
      "Condensation: cooling causes gas particles to lose energy and form a liquid.",
      "CONDENSATION\nWhen vapour cools, its particles come together and it turns into liquid.",
    ],
  },
  {
    family: "method",
    requests: [
      "Describe the procedure used for filtration.",
      "How is filtration carried out?",
      "Give the method for filtration.",
    ],
    resources: [
      "Filtration is carried out by pouring the mixture through filter paper so the liquid passes while the solid remains.",
      "Filtration method: place filter paper in a funnel, then pour the mixture through it.",
      "FILTRATION\nTo perform it, pass the mixture through a porous barrier that retains the insoluble solid.",
    ],
  },
  {
    family: "formula and symbols",
    requests: [
      "State the relation for electrical power and define P.",
      "Give the electrical power equation, including what P represents.",
      "Which formula gives electrical power, and what is the meaning of P?",
    ],
    resources: [
      "Electrical power is given by P = V x I. P represents power, V voltage, and I current.",
      "POWER EQUATION\nP = VI, where P means electrical power, V means voltage and I means current.",
      "For electrical power, multiply voltage by current: P = V * I. The symbol P denotes power.",
    ],
  },
  {
    family: "unit and condition",
    requests: [
      "State the unit of pressure and the condition for using force divided by area.",
      "In what unit is pressure measured, and when does P = F/A apply?",
      "Give pressure's unit together with the applicability condition of P = F/A.",
    ],
    resources: [
      "Pressure is measured in pascals. P = F/A applies when force acts perpendicular to the surface area.",
      "PRESSURE\nUnit: pascal (Pa). Condition: use P = F/A for a normal force over the stated area.",
      "The SI unit for pressure is Pa; dividing force by area is applicable when the force is at right angles to the surface.",
    ],
  },
] as const;

describe("PV8-1 shared semantic generalization", () => {
  it.each(matrices)("supports the $family 3x3 request/resource matrix", (family) => {
    for (const question of family.requests) {
      for (const resource of family.resources) {
        expect(classification(question, resource), `${question} :: ${resource}`).toBe(
          "SUPPORTED"
        );
      }
    }
  });

  it("resolves a unique user referent for a bounded process follow-up", () => {
    const context = [{ role: "USER" as const, content: "Teach me about condensation." }];
    for (const question of [
      "How does that process happen?",
      "Describe how it takes place.",
      "What happens during it?",
    ]) {
      expect(
        classification(
          question,
          "Condensation occurs when cooled vapour loses energy and becomes liquid.",
          context
        )
      ).toBe("SUPPORTED");
    }
  });

  it("keeps semantic negative controls fail-closed", () => {
    expect(
      classification(
        "Explain how condensation takes place.",
        "Evaporation is the process by which liquid changes into vapour."
      )
    ).toBe("INSUFFICIENT_CONTEXT");
    expect(
      classification(
        "Give a general explanation of diffusion.",
        "Diffusion is carried out by stirring a mixture through filter paper."
      )
    ).toBe("INSUFFICIENT_CONTEXT");
    expect(
      classification(
        "State the relation for electrical power and define P.",
        "Pressure uses P = F/A. P represents pressure."
      )
    ).toBe("INSUFFICIENT_CONTEXT");
    expect(
      classification(
        "Give pressure's unit together with the applicability condition of P = F/A.",
        "Pressure is measured in pascals. P = F/A applies when force is parallel to the surface."
      )
    ).toBe("INSUFFICIENT_CONTEXT");
  });
});

function stableHash(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
