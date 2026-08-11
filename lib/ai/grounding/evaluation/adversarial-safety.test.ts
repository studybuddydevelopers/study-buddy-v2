import { describe, expect, it } from "vitest";
import { ResourceChunkType, ResourceSourceKind } from "@prisma/client";
import {
  ADVERSARIAL_SAFETY_SPLIT,
  adversarialSafetyCases,
  adversarialSafetyResources,
} from "./adversarial-safety";
import {
  groundedEvaluationCases,
  groundedEvaluationResources,
} from "./fixtures";
import {
  buildEvaluationTopologyReport,
  resolveEvaluationMetadataForCases,
} from "./metadata-scope";
import {
  buildEvaluationResourceScope,
  resolveEvaluationResourcesForSplit,
} from "./resource-scope";
import { evaluateRetrievalSufficiency } from "../sufficiency";
import type { GroundedEvaluationResource } from "./types";
import type { RetrievedChunk } from "@/lib/resources/retrieval/types";

describe("disclosed adversarial safety split", () => {
  it("defines a broad disclosed safety suite with unique scoped fixtures", () => {
    const caseIds = adversarialSafetyCases.map((item) => item.id);
    const resourceIds = adversarialSafetyResources.map((item) => item.id);

    expect(adversarialSafetyCases).toHaveLength(40);
    expect(new Set(caseIds).size).toBe(caseIds.length);
    expect(new Set(resourceIds).size).toBe(resourceIds.length);
    expect(caseIds.every((id) => id.startsWith("adv-"))).toBe(true);
    expect(resourceIds.every((id) => id.startsWith("adv-"))).toBe(true);
    expect(
      groundedEvaluationCases
        .filter((item) => item.split !== ADVERSARIAL_SAFETY_SPLIT)
        .some((item) => item.id.startsWith("adv-"))
    ).toBe(false);
  });

  it("covers the disclosed adversarial categories", () => {
    const categories = adversarialSafetyCases.map((item) =>
      item.notes?.match(/category=([^;]+)/)?.[1]
    );
    const counts = new Map<string, number>();
    for (const category of categories) {
      if (!category) continue;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }

    expect(counts.get("resource_prompt_injection")).toBeGreaterThanOrEqual(4);
    expect(counts.get("user_bypass")).toBeGreaterThanOrEqual(2);
    expect(counts.get("evidence_conflict")).toBeGreaterThanOrEqual(3);
    expect(counts.get("evidence_conflict_control")).toBeGreaterThanOrEqual(2);
    expect(counts.get("missing_required_input")).toBeGreaterThanOrEqual(4);
    expect(counts.get("missing_required_input_control")).toBeGreaterThanOrEqual(4);
    expect(counts.get("undefined_symbol")).toBeGreaterThanOrEqual(4);
    expect(counts.get("sibling_concept")).toBeGreaterThanOrEqual(4);
    expect(counts.get("current_external_information")).toBeGreaterThanOrEqual(3);
    expect(counts.get("contextual_carry_over")).toBeGreaterThanOrEqual(3);
    expect(counts.get("wrong_subject_topic")).toBeGreaterThanOrEqual(1);
    expect(counts.get("unsupported_elaboration")).toBeGreaterThanOrEqual(4);
  });

  it("resolves exact adversarial resource scope without extra resources", () => {
    const resolved = resolveEvaluationResourcesForSplit(
      adversarialSafetyCases,
      groundedEvaluationResources
    );
    const scope = buildEvaluationResourceScope({
      split: ADVERSARIAL_SAFETY_SPLIT,
      cases: adversarialSafetyCases,
      allResources: groundedEvaluationResources,
      resolvedResources: resolved,
    });

    expect(scope.selectedCaseCount).toBe(40);
    expect(scope.referencedResourceCount).toBe(adversarialSafetyResources.length);
    expect(scope.seededResourceCount).toBe(adversarialSafetyResources.length);
    expect(scope.referencedChunkCount).toBe(adversarialSafetyResources.length);
    expect(scope.embeddedChunkCount).toBe(adversarialSafetyResources.length);
    expect(scope.extraResourceCount).toBe(0);
    expect(resolved.every((item) => item.id.startsWith("adv-"))).toBe(true);
  });

  it("validates adversarial topology including metadata-only current-info topics", () => {
    const resolved = resolveEvaluationResourcesForSplit(
      adversarialSafetyCases,
      groundedEvaluationResources
    );
    const metadata = resolveEvaluationMetadataForCases(
      adversarialSafetyCases,
      resolved
    );
    const topology = buildEvaluationTopologyReport({
      cases: adversarialSafetyCases,
      metadataScope: metadata,
    });

    expect(topology.casesChecked).toBe(40);
    expect(topology.validRetrievalFilters).toBe(40);
    expect(topology.invalidRetrievalFilters).toBe(0);
    expect(metadata.metadataOnlyTopicIds).toEqual(
      expect.arrayContaining([
        "adv-topic-current-info-english",
        "adv-topic-current-info-geography",
        "adv-topic-current-info-mathematics",
      ])
    );
  });

  it("keeps representative safety sufficiency behavior deterministic", () => {
    expect(sufficiencyFor("adv-injection-ratio-markdown").sufficient).toBe(true);
    expect(sufficiencyFor("adv-conflict-scanning-definition").reason).toBe(
      "RESOURCE_CONFLICT"
    );
    expect(sufficiencyFor("adv-input-interest-missing-time").reason).toBe(
      "REQUIRED_INPUT_MISSING"
    );
    expect(sufficiencyFor("adv-input-interest-complete").sufficient).toBe(true);
    expect(sufficiencyFor("adv-symbol-negated-k").reason).toBe(
      "REQUIRED_SYMBOL_DEFINITION_MISSING"
    );
    expect(sufficiencyFor("adv-external-electric-current-control").sufficient).toBe(
      true
    );
    expect(sufficiencyFor("adv-sibling-meiosis-from-mitosis").reason).toBe(
      "CONCEPT_MISMATCH"
    );
  });
});

function sufficiencyFor(caseId: string) {
  const evaluationCase = adversarialSafetyCases.find((item) => item.id === caseId);
  if (!evaluationCase) throw new Error(`Unknown adversarial case ${caseId}.`);
  const resources = resolveEvaluationResourcesForSplit(
    [evaluationCase],
    groundedEvaluationResources
  );
  const chunks = resources.map(toRetrievedChunk);

  return evaluateRetrievalSufficiency({
    query: evaluationCase.messages.at(-1)?.content ?? "",
    candidates: chunks,
    selectedChunks: chunks,
    subjectId: evaluationCase.subjectId,
    topicId: evaluationCase.topicId,
  });
}

function toRetrievedChunk(resource: GroundedEvaluationResource): RetrievedChunk {
  return {
    id: resource.chunkId,
    resourceId: resource.id,
    resourceTitle: resource.title,
    sourceKind: ResourceSourceKind.UPLOAD,
    chunkIndex: 0,
    chunkType: resource.chunkType as ResourceChunkType,
    title: resource.title,
    content: resource.content,
    snippet: resource.content.slice(0, 180),
    contentHash: `hash-${resource.chunkId}`,
    subjectId: resource.subjectId,
    topicId: resource.topicId ?? null,
    questionNumber: resource.questionNumber ?? null,
    vectorRank: 1,
    vectorDistance: 0.2,
    keywordRank: 1,
    keywordScore: 0.25,
    exactSignals: [],
    fusionScore: 0.05,
    bestBranchRank: 1,
    alternateProvenance: [],
  };
}
