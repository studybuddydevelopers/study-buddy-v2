import { describe, expect, it } from "vitest";
import { decideAnswerability } from "./answerability/answerability-decider";
import { extractEvidenceCapabilities } from "./capabilities/evidence-capability-extractor";
import type { AuthorizedEvidenceChunk } from "./capabilities/types";
import { extractRequestRequirements } from "./requirements/request-requirement-extractor";
import type { RequestContextMessage } from "./requirements/types";

const SUBJECT_ID = "pv8-iter2-subject";
const TOPIC_ID = "pv8-iter2-topic";

function classify(
  question: string,
  contents: string[],
  recentMessages: RequestContextMessage[] = []
) {
  const requirements = extractRequestRequirements({
    requestId: `request-${question}`,
    question,
    subjectId: SUBJECT_ID,
    topicId: TOPIC_ID,
    recentMessages,
  });
  const chunks: AuthorizedEvidenceChunk[] = contents.map((content, index) => ({
    resourceChunkId: `chunk-${index + 1}`,
    sourceLabel: `SOURCE_${index + 1}`,
    subjectId: SUBJECT_ID,
    topicId: TOPIC_ID,
    title: `Iter2 card ${index + 1}`,
    content,
  }));
  const evidenceCapabilities = extractEvidenceCapabilities({ chunks });
  return decideAnswerability({
    requestRequirements: requirements,
    evidenceCapabilities,
  });
}

function expectClassification(
  question: string,
  contents: string[],
  expected: "SUPPORTED" | "INSUFFICIENT_CONTEXT",
  recentMessages: RequestContextMessage[] = []
) {
  expect(classify(question, contents, recentMessages).classification).toBe(expected);
}

describe("PV8-1 Iteration 2 semantic safety matrices", () => {
  describe("formula-scoped symbols", () => {
    const question = "In the electrical power formula P = V x I, what does P mean?";

    it("accepts the same symbol in the correct formula", () => {
      expectClassification(question, ["P = V x I, where P means electrical power."], "SUPPORTED");
    });

    it("rejects the same symbol in a different formula", () => {
      expectClassification(question, ["P = F/A, where P means pressure."], "INSUFFICIENT_CONTEXT");
    });

    it("selects the correctly scoped definition when another formula reuses the symbol", () => {
      expectClassification(
        question,
        ["P = F/A, where P means pressure.", "P = V x I, where P means electrical power."],
        "SUPPORTED"
      );
    });

    it("rejects conflicting meanings in the requested formula scope", () => {
      expectClassification(
        question,
        ["P = V x I, where P means electrical power.", "P = V x I, where P means pressure."],
        "INSUFFICIENT_CONTEXT"
      );
    });

    it("rejects a global symbol definition when the required formula is absent", () => {
      expectClassification(question, ["The symbol P means electrical power."], "INSUFFICIENT_CONTEXT");
    });
  });

  describe("formula-scoped applicability conditions", () => {
    const question = "State when the pressure formula P = F/A applies.";

    it("accepts a correct condition in the correct scope", () => {
      expectClassification(
        question,
        ["Pressure uses P = F/A. P = F/A applies when force is perpendicular to the surface."],
        "SUPPORTED"
      );
    });

    it("rejects condition wording attached to another concept", () => {
      expectClassification(
        question,
        ["Triangle area uses A = 1/2bh. It applies when h is perpendicular to b."],
        "INSUFFICIENT_CONTEXT"
      );
    });

    it("rejects definition-only evidence", () => {
      expectClassification(question, ["Pressure is force acting per unit area."], "INSUFFICIENT_CONTEXT");
    });

    it("rejects an unscoped generic condition", () => {
      expectClassification(question, ["Use the value only when it is valid."], "INSUFFICIENT_CONTEXT");
    });

    it("rejects incompatible same-scope conditions", () => {
      expectClassification(
        question,
        [
          "Pressure uses P = F/A. P = F/A applies when force is perpendicular to the surface.",
          "Pressure uses P = F/A. P = F/A applies when force is parallel to the surface.",
        ],
        "INSUFFICIENT_CONTEXT"
      );
    });
  });

  describe("heading scope and local anaphora", () => {
    it("binds an immediate definition pronoun to its heading", () => {
      expectClassification(
        "Define diffusion.",
        ["DIFFUSION\nThis term means net particle movement down a concentration difference."],
        "SUPPORTED"
      );
    });

    it("does not inherit a distant heading across a peer heading", () => {
      expectClassification(
        "Define diffusion.",
        ["DIFFUSION\nOSMOSIS\nThis term means movement of water through a partially permeable membrane."],
        "INSUFFICIENT_CONTEXT"
      );
    });

    it("does not turn a definition under a heading into process evidence", () => {
      expectClassification(
        "Explain how condensation takes place.",
        ["CONDENSATION\nThis term means the change from gas to liquid."],
        "INSUFFICIENT_CONTEXT"
      );
    });
  });

  describe("process and procedure remain distinct", () => {
    it("accepts process evidence for a process request", () => {
      expectClassification(
        "Describe the process involved in condensation.",
        ["CONDENSATION\nIt occurs when cooled vapour loses energy and becomes liquid."],
        "SUPPORTED"
      );
    });

    it("accepts a heading-local method", () => {
      expectClassification(
        "Give the method for filtration.",
        ["FILTRATION\nTo perform it, pour the mixture through filter paper in a funnel."],
        "SUPPORTED"
      );
    });

    it("does not satisfy a method request with process mechanism alone", () => {
      expectClassification(
        "Give the method for filtration.",
        ["Filtration happens because pores allow liquid through while retaining larger particles."],
        "INSUFFICIENT_CONTEXT"
      );
    });
  });

  describe("unit and condition completeness", () => {
    const question = "State the unit of pressure and when P = F/A applies.";

    it("requires and accepts both typed parts", () => {
      expectClassification(
        question,
        ["Pressure is measured in pascals. P = F/A applies when force is perpendicular to area."],
        "SUPPORTED"
      );
    });

    it("rejects a missing unit", () => {
      expectClassification(question, ["P = F/A applies when force is perpendicular to area."], "INSUFFICIENT_CONTEXT");
    });

    it("rejects a missing condition", () => {
      expectClassification(question, ["Pressure is measured in pascals. Pressure uses P = F/A."], "INSUFFICIENT_CONTEXT");
    });
  });

  describe("bounded contextual follow-up", () => {
    const evidence = ["Condensation occurs when cooled vapour loses energy and becomes liquid."];

    it("uses a unique prior user process referent", () => {
      expectClassification(
        "Describe how it takes place.",
        evidence,
        "SUPPORTED",
        [{ role: "USER", content: "Teach me about condensation." }]
      );
    });

    it("does not use assistant-only context", () => {
      expectClassification(
        "Describe how it takes place.",
        evidence,
        "INSUFFICIENT_CONTEXT",
        [{ role: "ASSISTANT", content: "We were discussing condensation." }]
      );
    });

    it("rejects an ambiguous user referent", () => {
      expectClassification(
        "Describe how it takes place.",
        evidence,
        "INSUFFICIENT_CONTEXT",
        [{ role: "USER", content: "Compare condensation and evaporation." }]
      );
    });
  });
});
