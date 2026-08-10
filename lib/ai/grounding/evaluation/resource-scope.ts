import type {
  GroundedEvaluationCase,
  GroundedEvaluationResource,
  GroundedEvaluationSplit,
} from "./types";

export interface EvaluationResourceScope {
  selectedSplit: GroundedEvaluationSplit | "all";
  selectedCaseCount: number;
  globalResourceCount: number;
  referencedResourceCount: number;
  seededResourceCount: number;
  unreferencedResourceCount: number;
  referencedChunkCount: number;
  embeddedChunkCount: number;
  extraResourceCount: number;
  referencedResourceIds: string[];
  seededResourceIds: string[];
  referencedChunkIds: string[];
}

export function resolveEvaluationResourcesForSplit(
  splitCases: GroundedEvaluationCase[],
  allEvaluationResources: GroundedEvaluationResource[]
) {
  const resourcesById = new Map(
    allEvaluationResources.map((item) => [item.id, item])
  );
  const resourcesByChunkId = new Map(
    allEvaluationResources.map((item) => [item.chunkId, item])
  );
  const selectedResourceIds = new Set<string>();

  for (const evaluationCase of splitCases) {
    for (const resourceId of [
      ...(evaluationCase.expectedResourceIds ?? []),
      ...(evaluationCase.setupResourceIds ?? []),
    ]) {
      if (!resourcesById.has(resourceId)) {
        throw new Error(
          `Evaluation case ${evaluationCase.id} references missing resource ${resourceId}.`
        );
      }
      selectedResourceIds.add(resourceId);
    }

    for (const chunkId of evaluationCase.expectedChunkIds ?? []) {
      const resource = resourcesByChunkId.get(chunkId);
      if (!resource) {
        throw new Error(
          `Evaluation case ${evaluationCase.id} references missing chunk ${chunkId}.`
        );
      }
      selectedResourceIds.add(resource.id);
    }
  }

  for (const evaluationCase of splitCases) {
    for (const chunkId of evaluationCase.expectedChunkIds ?? []) {
      const resource = resourcesByChunkId.get(chunkId);
      if (!resource || !selectedResourceIds.has(resource.id)) {
        throw new Error(
          `Evaluation case ${evaluationCase.id} references chunk ${chunkId} outside the selected resource scope.`
        );
      }
    }
  }

  return allEvaluationResources.filter((item) => selectedResourceIds.has(item.id));
}

export function buildEvaluationResourceScope(input: {
  split: GroundedEvaluationSplit | "all";
  cases: GroundedEvaluationCase[];
  allResources: GroundedEvaluationResource[];
  resolvedResources: GroundedEvaluationResource[];
}) {
  const seededResourceIds = input.resolvedResources.map((item) => item.id);
  const referencedChunkIds = input.resolvedResources.map((item) => item.chunkId);
  const referencedResourceIds = collectReferencedResourceIds({
    cases: input.cases,
    allResources: input.allResources,
  });
  const extraResourceIds = seededResourceIds.filter(
    (resourceId) => !referencedResourceIds.includes(resourceId)
  );

  return {
    selectedSplit: input.split,
    selectedCaseCount: input.cases.length,
    globalResourceCount: input.allResources.length,
    referencedResourceCount: referencedResourceIds.length,
    seededResourceCount: seededResourceIds.length,
    unreferencedResourceCount: input.allResources.length - seededResourceIds.length,
    referencedChunkCount: referencedChunkIds.length,
    embeddedChunkCount: referencedChunkIds.length,
    extraResourceCount: extraResourceIds.length,
    referencedResourceIds,
    seededResourceIds,
    referencedChunkIds,
  } satisfies EvaluationResourceScope;
}

export function assertEvaluationResourceScope(scope: EvaluationResourceScope) {
  const referenced = new Set(scope.referencedResourceIds);
  const extras = scope.seededResourceIds.filter((resourceId) => !referenced.has(resourceId));
  if (extras.length > 0) {
    throw new Error(
      `Evaluation resource scope includes unreferenced resource(s): ${extras.join(", ")}.`
    );
  }
  if (scope.seededResourceCount !== scope.referencedResourceCount) {
    throw new Error(
      `Evaluation resource scope mismatch: referenced=${scope.referencedResourceCount}, seeded=${scope.seededResourceCount}.`
    );
  }
}

function collectReferencedResourceIds(input: {
  cases: GroundedEvaluationCase[];
  allResources: GroundedEvaluationResource[];
}) {
  const resourcesByChunkId = new Map(
    input.allResources.map((item) => [item.chunkId, item])
  );
  const resourceIds = new Set<string>();

  for (const evaluationCase of input.cases) {
    for (const resourceId of [
      ...(evaluationCase.expectedResourceIds ?? []),
      ...(evaluationCase.setupResourceIds ?? []),
    ]) {
      resourceIds.add(resourceId);
    }
    for (const chunkId of evaluationCase.expectedChunkIds ?? []) {
      const resource = resourcesByChunkId.get(chunkId);
      if (resource) resourceIds.add(resource.id);
    }
  }

  return input.allResources
    .map((item) => item.id)
    .filter((resourceId) => resourceIds.has(resourceId));
}
