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
  caseCorpus: EvaluationCaseCorpusScope[];
  corpusSummary: EvaluationCorpusScopeSummary;
}

export interface EvaluationCaseCorpusScope {
  caseId: string;
  shouldAnswer: boolean;
  corpusResourceIds: string[];
  corpusChunkIds: string[];
  resourceCount: number;
  chunkCount: number;
  metadataOnlySubject: boolean;
  metadataOnlyTopic: boolean;
  valid: boolean;
  contaminationReasons: string[];
}

export interface EvaluationCorpusScopeSummary {
  casesChecked: number;
  corpusValidCases: number;
  contaminatedCases: number;
  maxResourcesPerCase: number;
  averageResourcesPerCase: number;
  extraUndeclaredResources: number;
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
      ...(evaluationCase.corpusResourceIds ?? []),
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
  const caseCorpus = buildEvaluationCaseCorpusScopes({
    cases: input.cases,
    allResources: input.allResources,
  });
  const corpusSummary = summarizeCaseCorpus(caseCorpus);
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
    caseCorpus,
    corpusSummary,
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
  const contaminated = scope.caseCorpus.filter((item) => !item.valid);
  if (contaminated.length > 0) {
    throw new Error(
      `Evaluation case corpus contamination: ${contaminated
        .map((item) => `${item.caseId} (${item.contaminationReasons.join("; ")})`)
        .join(", ")}.`
    );
  }
}

export function buildEvaluationCaseCorpusScopes(input: {
  cases: GroundedEvaluationCase[];
  allResources: GroundedEvaluationResource[];
}) {
  const resourcesById = new Map(
    input.allResources.map((item) => [item.id, item])
  );
  const resourcesByChunkId = new Map(
    input.allResources.map((item) => [item.chunkId, item])
  );

  return input.cases.map((evaluationCase) => {
    const requiredResourceIds = collectCaseRequiredResourceIds(
      evaluationCase,
      resourcesByChunkId
    );
    const corpusResourceIds = uniquePreservingOrder(
      evaluationCase.corpusResourceIds ?? requiredResourceIds
    );
    const resources = corpusResourceIds
      .map((resourceId) => resourcesById.get(resourceId))
      .filter((item): item is GroundedEvaluationResource => Boolean(item));
    const reasons: string[] = [];
    const unknownResourceIds = corpusResourceIds.filter(
      (resourceId) => !resourcesById.has(resourceId)
    );
    const missingRequiredIds = requiredResourceIds.filter(
      (resourceId) => !corpusResourceIds.includes(resourceId)
    );
    const duplicateResourceIds = duplicateValues(
      evaluationCase.corpusResourceIds ?? []
    );

    if (evaluationCase.split === "adversarial_safety" && !evaluationCase.corpusResourceIds) {
      reasons.push("adversarial safety case must declare corpusResourceIds");
    }
    if (unknownResourceIds.length > 0) {
      reasons.push(`unknown corpus resource(s): ${unknownResourceIds.join(", ")}`);
    }
    if (missingRequiredIds.length > 0) {
      reasons.push(`required resource(s) outside corpus: ${missingRequiredIds.join(", ")}`);
    }
    if (duplicateResourceIds.length > 0) {
      reasons.push(`duplicate corpus resource(s): ${duplicateResourceIds.join(", ")}`);
    }
    reasons.push(...detectFixtureCorpusContamination(evaluationCase, resources));

    return {
      caseId: evaluationCase.id,
      shouldAnswer: evaluationCase.shouldAnswer,
      corpusResourceIds,
      corpusChunkIds: resources.map((item) => item.chunkId),
      resourceCount: corpusResourceIds.length,
      chunkCount: resources.length,
      metadataOnlySubject:
        Boolean(evaluationCase.subjectId) &&
        resources.every((resource) => resource.subjectId !== evaluationCase.subjectId),
      metadataOnlyTopic:
        Boolean(evaluationCase.topicId) &&
        resources.every((resource) => resource.topicId !== evaluationCase.topicId),
      valid: reasons.length === 0,
      contaminationReasons: reasons,
    } satisfies EvaluationCaseCorpusScope;
  });
}

export function corpusResourceIdsForCase(
  evaluationCase: GroundedEvaluationCase,
  allResources: GroundedEvaluationResource[]
) {
  const resourcesByChunkId = new Map(
    allResources.map((item) => [item.chunkId, item])
  );
  return uniquePreservingOrder(
    evaluationCase.corpusResourceIds ??
      collectCaseRequiredResourceIds(evaluationCase, resourcesByChunkId)
  );
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
      ...(evaluationCase.corpusResourceIds ?? []),
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

function collectCaseRequiredResourceIds(
  evaluationCase: GroundedEvaluationCase,
  resourcesByChunkId: Map<string, GroundedEvaluationResource>
) {
  const resourceIds = new Set<string>();
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
  return Array.from(resourceIds);
}

function summarizeCaseCorpus(caseCorpus: EvaluationCaseCorpusScope[]) {
  const resourceCounts = caseCorpus.map((item) => item.resourceCount);
  const contaminatedCases = caseCorpus.filter((item) => !item.valid).length;
  return {
    casesChecked: caseCorpus.length,
    corpusValidCases: caseCorpus.length - contaminatedCases,
    contaminatedCases,
    maxResourcesPerCase: Math.max(0, ...resourceCounts),
    averageResourcesPerCase:
      resourceCounts.length === 0
        ? 0
        : resourceCounts.reduce((sum, value) => sum + value, 0) /
          resourceCounts.length,
    extraUndeclaredResources: 0,
  } satisfies EvaluationCorpusScopeSummary;
}

function detectFixtureCorpusContamination(
  evaluationCase: GroundedEvaluationCase,
  resources: GroundedEvaluationResource[]
) {
  const category = evaluationCase.notes?.match(/category=([^;]+)/)?.[1] ?? "";
  if (
    category !== "missing_required_input" &&
    category !== "sibling_concept"
  ) {
    return [];
  }

  const corpusText = resources.map((resource) => resource.content).join("\n");
  const contaminatedClaims = (evaluationCase.forbiddenClaims ?? []).filter(
    (claim) => containsPhrase(corpusText, claim)
  );
  return contaminatedClaims.length > 0
    ? [`direct-answer evidence in corpus: ${contaminatedClaims.join(", ")}`]
    : [];
}

function containsPhrase(text: string, phrase: string) {
  const normalizedPhrase = phrase.toLowerCase().trim();
  if (!normalizedPhrase) return false;
  const escaped = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

function duplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return Array.from(duplicates);
}

function uniquePreservingOrder(values: string[]) {
  return Array.from(new Set(values));
}
