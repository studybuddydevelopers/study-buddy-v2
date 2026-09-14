import { describe, expect, it } from "vitest";
import { decideAnswerability } from "./answerability/answerability-decider";
import {
  detectCapabilityConflicts,
  extractEvidenceCapabilities,
} from "./capabilities/evidence-capability-extractor";
import type { AuthorizedEvidenceChunk } from "./capabilities/types";
import { extractRequestRequirements } from "./requirements/request-requirement-extractor";
import type { RequestRequirement, RequestRequirements } from "./requirements/types";

const SUBJECT_ID = "subject-broad-v3";
const TOPIC_ID = "topic-broad-v3";

function chunk(
  content: string,
  overrides: Partial<AuthorizedEvidenceChunk> = {}
): AuthorizedEvidenceChunk {
  return {
    resourceChunkId: overrides.resourceChunkId ?? `chunk-${stableId(content)}`,
    sourceLabel: overrides.sourceLabel ?? "SOURCE_1",
    subjectId: overrides.subjectId ?? SUBJECT_ID,
    topicId: overrides.topicId ?? TOPIC_ID,
    title: overrides.title ?? "Broad v3 conflict control chunk",
    content,
  };
}

function run(question: string, chunks: AuthorizedEvidenceChunk[]) {
  const requestRequirements = extractRequestRequirements({
    requestId: "request-broad-v3",
    question,
    subjectId: SUBJECT_ID,
    topicId: TOPIC_ID,
  });
  return decideWith(requestRequirements, chunks);
}

function decideWith(
  requestRequirements: RequestRequirements,
  chunks: AuthorizedEvidenceChunk[]
) {
  const evidenceCapabilities = extractEvidenceCapabilities({ chunks });
  const conflicts = detectCapabilityConflicts(evidenceCapabilities);
  const decision = decideAnswerability({
    requestRequirements,
    evidenceCapabilities,
    conflicts,
  });
  return { requestRequirements, evidenceCapabilities, conflicts, decision };
}

function customRequest(requirement: RequestRequirement): RequestRequirements {
  return {
    requestId: "request-broad-v3-custom",
    normalizedQuestion: "custom",
    subjectId: SUBJECT_ID,
    topicId: TOPIC_ID,
    requirements: [requirement],
    safetyIntent: {
      asksForCurrentExternalInfo: false,
      containsHostileQuotedText: false,
      asksToIgnoreSources: false,
    },
  };
}

describe("Stage 4.1 broad-property v3 typed value conflict semantics", () => {
  it("turns same-scope positive and negated definition values into a conflict", () => {
    const result = run("What is osmosis?", [
      chunk("Osmosis is movement of water across a membrane.", {
        resourceChunkId: "definition-positive",
        sourceLabel: "SOURCE_1",
      }),
      chunk("Osmosis is not movement of water across a membrane.", {
        resourceChunkId: "definition-negated",
        sourceLabel: "SOURCE_2",
      }),
    ]);

    expect(result.conflicts).toEqual([
      expect.objectContaining({
        conflictType: "VALUE_CONFLICT",
        scopeKey: "value:definition:osmosis",
      }),
    ]);
    expect(result.decision.classification).toBe("INSUFFICIENT_CONTEXT");
    expect(result.decision.refusalReason).toBe("UNRESOLVED_CONFLICT");
    expect(result.decision.validatedEvidenceUnits).toEqual([]);
  });

  it("detects same-scope incompatible units only for unit requirements", () => {
    const chunks = [
      chunk("Speed is distance divided by time. Speed is measured in metres per second.", {
        resourceChunkId: "unit-a",
        sourceLabel: "SOURCE_1",
      }),
      chunk("Speed is measured in metres per second squared.", {
        resourceChunkId: "unit-b",
        sourceLabel: "SOURCE_2",
      }),
    ];

    const unitResult = run("What is speed and what unit is it measured in?", chunks);
    expect(unitResult.conflicts).toContainEqual(
      expect.objectContaining({
        conflictType: "VALUE_CONFLICT",
        scopeKey: "value:unit:speed",
      })
    );
    expect(unitResult.decision.classification).toBe("INSUFFICIENT_CONTEXT");
    expect(unitResult.decision.refusalReason).toBe("UNRESOLVED_CONFLICT");

    const definitionOnly = run("What is speed?", chunks);
    expect(definitionOnly.decision.classification).toBe("SUPPORTED");
  });

  it("detects same-formula incompatible symbol meanings", () => {
    const result = run("In P = F / A, what does P mean?", [
      chunk("P = F / A, where P is pressure.", {
        resourceChunkId: "symbol-a",
        sourceLabel: "SOURCE_1",
      }),
      chunk("P = F / A, where P is power.", {
        resourceChunkId: "symbol-b",
        sourceLabel: "SOURCE_2",
      }),
    ]);

    expect(result.conflicts).toContainEqual(
      expect.objectContaining({
        conflictType: "VALUE_CONFLICT",
        scopeKey: "value:symbol:p:formula:p=f/a",
      })
    );
    expect(result.decision.classification).toBe("INSUFFICIENT_CONTEXT");
    expect(result.decision.refusalReason).toBe("UNRESOLVED_CONFLICT");
  });

  it("detects same-scope incompatible conditions where condition is required", () => {
    const request = customRequest({
      id: "req-condition",
      kind: "FACT_LOOKUP",
      subjectId: SUBJECT_ID,
      topicId: TOPIC_ID,
      targetConcepts: ["area of triangle"],
      requestedFacet: "CONDITION",
      requestedFact: "condition for triangle area",
    });
    const result = decideWith(request, [
      chunk(
        "Triangle area formula is A = b x h. The height must meet the base at a right angle.",
        { resourceChunkId: "condition-a", sourceLabel: "SOURCE_1" }
      ),
      chunk("Triangle area formula is A = b x h. The height must be a slanted side.", {
        resourceChunkId: "condition-b",
        sourceLabel: "SOURCE_2",
      }),
    ]);

    expect(result.conflicts).toContainEqual(
      expect.objectContaining({
        conflictType: "VALUE_CONFLICT",
        scopeKey: "value:condition:area-of-triangle",
      })
    );
    expect(result.decision.classification).toBe("INSUFFICIENT_CONTEXT");
    expect(result.decision.refusalReason).toBe("UNRESOLVED_CONFLICT");
  });

  it("does not classify equivalent duplicate assertions as conflicts", () => {
    const result = run("What is density?", [
      chunk("Density is mass per unit volume.", {
        resourceChunkId: "density-a",
        sourceLabel: "SOURCE_1",
      }),
      chunk("Density means mass per unit volume.", {
        resourceChunkId: "density-b",
        sourceLabel: "SOURCE_2",
      }),
    ]);

    expect(result.conflicts).toEqual([]);
    expect(result.decision.classification).toBe("SUPPORTED");
  });

  it("does not let a wrong-concept conflict poison the requested target", () => {
    const result = run("What is density?", [
      chunk("Density is mass per unit volume.", {
        resourceChunkId: "density",
        sourceLabel: "SOURCE_1",
      }),
      chunk("Osmosis is movement of water across a membrane.", {
        resourceChunkId: "osmosis-a",
        sourceLabel: "SOURCE_2",
      }),
      chunk("Osmosis is not movement of water across a membrane.", {
        resourceChunkId: "osmosis-b",
        sourceLabel: "SOURCE_3",
      }),
    ]);

    expect(result.conflicts).toContainEqual(
      expect.objectContaining({ scopeKey: "value:definition:osmosis" })
    );
    expect(result.decision.classification).toBe("SUPPORTED");
    expect(result.decision.conflictIds).toBeUndefined();
  });

  it("does not let wrong-formula symbol conflicts poison the requested formula scope", () => {
    const result = run("In R = V / I, what does R mean?", [
      chunk("R = V / I, where R is resistance.", {
        resourceChunkId: "target-resistance",
        sourceLabel: "SOURCE_1",
      }),
      chunk("A = pi r^2, where r is radius.", {
        resourceChunkId: "circle-a",
        sourceLabel: "SOURCE_2",
      }),
      chunk("A = pi r^2, where r is rate.", {
        resourceChunkId: "circle-b",
        sourceLabel: "SOURCE_3",
      }),
    ]);

    expect(result.conflicts).toContainEqual(
      expect.objectContaining({ scopeKey: "value:symbol:r:formula:a=pir^2" })
    );
    expect(result.decision.classification).toBe("SUPPORTED");
    expect(result.decision.conflictIds).toBeUndefined();
  });

  it("keeps conflict detection stable when source order changes", () => {
    const first = run("What is osmosis?", [
      chunk("Osmosis is movement of water across a membrane.", {
        resourceChunkId: "ordered-a",
        sourceLabel: "SOURCE_1",
      }),
      chunk("Osmosis is not movement of water across a membrane.", {
        resourceChunkId: "ordered-b",
        sourceLabel: "SOURCE_2",
      }),
    ]);
    const second = run("What is osmosis?", [
      chunk("Osmosis is not movement of water across a membrane.", {
        resourceChunkId: "ordered-b",
        sourceLabel: "SOURCE_2",
      }),
      chunk("Osmosis is movement of water across a membrane.", {
        resourceChunkId: "ordered-a",
        sourceLabel: "SOURCE_1",
      }),
    ]);

    expect(first.conflicts.map((conflict) => [conflict.conflictType, conflict.scopeKey])).toEqual(
      second.conflicts.map((conflict) => [conflict.conflictType, conflict.scopeKey])
    );
    expect(first.decision.refusalReason).toBe("UNRESOLVED_CONFLICT");
    expect(second.decision.refusalReason).toBe("UNRESOLVED_CONFLICT");
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
