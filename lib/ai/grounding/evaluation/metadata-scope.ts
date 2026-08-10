import type { GroundedEvaluationCase, GroundedEvaluationResource } from "./types";

export interface EvaluationMetadataTopic {
  id: string;
  subjectId: string;
}

export interface EvaluationMetadataScope {
  selectedCaseCount: number;
  subjectIds: string[];
  topics: EvaluationMetadataTopic[];
  caseSubjectIds: string[];
  caseTopicIds: string[];
  resourceSubjectIds: string[];
  resourceTopicIds: string[];
  metadataOnlySubjectIds: string[];
  metadataOnlyTopicIds: string[];
}

export interface EvaluationTopologyCaseResult {
  caseId: string;
  subjectId: string | null;
  topicId: string | null;
  validRetrievalFilters: boolean;
  error: string | null;
}

export interface EvaluationTopologyReport {
  casesChecked: number;
  validRetrievalFilters: number;
  invalidRetrievalFilters: number;
  metadataOnlySubjects: number;
  metadataOnlyTopics: number;
  metadataOnlySubjectIds: string[];
  metadataOnlyTopicIds: string[];
  cases: EvaluationTopologyCaseResult[];
}

interface MetadataSource {
  kind: "case" | "resource";
  id: string;
  subjectId?: string;
  topicId?: string;
}

export function resolveEvaluationMetadataForCases(
  cases: GroundedEvaluationCase[],
  scopedResources: GroundedEvaluationResource[] = []
): EvaluationMetadataScope {
  const subjectIds = new Set<string>();
  const caseSubjectIds = new Set<string>();
  const caseTopicIds = new Set<string>();
  const resourceSubjectIds = new Set<string>();
  const resourceTopicIds = new Set<string>();
  const topicSubjects = new Map<string, string>();

  for (const evaluationCase of cases) {
    declareMetadata({
      source: { kind: "case", id: evaluationCase.id },
      subjectId: evaluationCase.subjectId,
      topicId: evaluationCase.topicId,
      subjectIds,
      topicSubjects,
      caseSubjectIds,
      caseTopicIds,
    });
  }

  for (const resource of scopedResources) {
    declareMetadata({
      source: { kind: "resource", id: resource.id },
      subjectId: resource.subjectId,
      topicId: resource.topicId,
      subjectIds,
      topicSubjects,
      caseSubjectIds: resourceSubjectIds,
      caseTopicIds: resourceTopicIds,
    });
  }

  const topics = Array.from(topicSubjects.entries())
    .map(([id, subjectId]) => ({ id, subjectId }))
    .sort(compareTopics);
  const sortedCaseSubjectIds = sortIds(Array.from(caseSubjectIds));
  const sortedCaseTopicIds = sortIds(Array.from(caseTopicIds));
  const sortedResourceSubjectIds = sortIds(Array.from(resourceSubjectIds));
  const sortedResourceTopicIds = sortIds(Array.from(resourceTopicIds));

  return {
    selectedCaseCount: cases.length,
    subjectIds: sortIds(Array.from(subjectIds)),
    topics,
    caseSubjectIds: sortedCaseSubjectIds,
    caseTopicIds: sortedCaseTopicIds,
    resourceSubjectIds: sortedResourceSubjectIds,
    resourceTopicIds: sortedResourceTopicIds,
    metadataOnlySubjectIds: sortedCaseSubjectIds.filter(
      (subjectId) => !resourceSubjectIds.has(subjectId)
    ),
    metadataOnlyTopicIds: sortedCaseTopicIds.filter(
      (topicId) => !resourceTopicIds.has(topicId)
    ),
  };
}

export function buildEvaluationTopologyReport(input: {
  cases: GroundedEvaluationCase[];
  metadataScope: EvaluationMetadataScope;
}): EvaluationTopologyReport {
  const subjects = new Set(input.metadataScope.subjectIds);
  const topics = new Map(
    input.metadataScope.topics.map((topic) => [topic.id, topic.subjectId])
  );
  const caseResults = input.cases.map((evaluationCase) =>
    validateCaseTopology({ evaluationCase, subjects, topics })
  );
  const invalid = caseResults.filter((item) => !item.validRetrievalFilters);

  return {
    casesChecked: input.cases.length,
    validRetrievalFilters: input.cases.length - invalid.length,
    invalidRetrievalFilters: invalid.length,
    metadataOnlySubjects: input.metadataScope.metadataOnlySubjectIds.length,
    metadataOnlyTopics: input.metadataScope.metadataOnlyTopicIds.length,
    metadataOnlySubjectIds: input.metadataScope.metadataOnlySubjectIds,
    metadataOnlyTopicIds: input.metadataScope.metadataOnlyTopicIds,
    cases: caseResults,
  };
}

export function assertEvaluationTopology(report: EvaluationTopologyReport) {
  if (report.invalidRetrievalFilters === 0) return;

  const errors = report.cases
    .filter((item) => !item.validRetrievalFilters)
    .map((item) => `${item.caseId}: ${item.error ?? "invalid retrieval filters"}`);
  throw new Error(`Evaluation topology invalid: ${errors.join("; ")}`);
}

function declareMetadata(input: {
  source: MetadataSource;
  subjectId?: string;
  topicId?: string;
  subjectIds: Set<string>;
  topicSubjects: Map<string, string>;
  caseSubjectIds: Set<string>;
  caseTopicIds: Set<string>;
}) {
  if (input.topicId && !input.subjectId) {
    throw new Error(
      `${input.source.kind} ${input.source.id} declares topic ${input.topicId} without a subject.`
    );
  }

  const subjectId = input.subjectId;
  if (subjectId) {
    input.subjectIds.add(subjectId);
    input.caseSubjectIds.add(subjectId);
  }

  if (!input.topicId) return;
  if (!subjectId) {
    throw new Error(
      `${input.source.kind} ${input.source.id} declares topic ${input.topicId} without a subject.`
    );
  }

  const existingSubjectId = input.topicSubjects.get(input.topicId);
  if (existingSubjectId && existingSubjectId !== input.subjectId) {
    throw new Error(
      `Evaluation topic ${input.topicId} is declared under both ${existingSubjectId} and ${input.subjectId}.`
    );
  }

  input.topicSubjects.set(input.topicId, subjectId);
  input.caseTopicIds.add(input.topicId);
}

function validateCaseTopology(input: {
  evaluationCase: GroundedEvaluationCase;
  subjects: Set<string>;
  topics: Map<string, string>;
}): EvaluationTopologyCaseResult {
  const { evaluationCase } = input;

  if (evaluationCase.topicId && !evaluationCase.subjectId) {
    return invalidCase(evaluationCase, "topic filter cannot be used without a subject");
  }

  if (evaluationCase.subjectId && !input.subjects.has(evaluationCase.subjectId)) {
    return invalidCase(evaluationCase, "subject metadata is missing");
  }

  if (evaluationCase.topicId) {
    const topicSubjectId = input.topics.get(evaluationCase.topicId);
    if (!topicSubjectId) {
      return invalidCase(evaluationCase, "topic metadata is missing");
    }
    if (topicSubjectId !== evaluationCase.subjectId) {
      return invalidCase(
        evaluationCase,
        "topic does not belong to the selected subject"
      );
    }
  }

  return {
    caseId: evaluationCase.id,
    subjectId: evaluationCase.subjectId ?? null,
    topicId: evaluationCase.topicId ?? null,
    validRetrievalFilters: true,
    error: null,
  };
}

function invalidCase(
  evaluationCase: GroundedEvaluationCase,
  error: string
): EvaluationTopologyCaseResult {
  return {
    caseId: evaluationCase.id,
    subjectId: evaluationCase.subjectId ?? null,
    topicId: evaluationCase.topicId ?? null,
    validRetrievalFilters: false,
    error,
  };
}

function compareTopics(a: EvaluationMetadataTopic, b: EvaluationMetadataTopic) {
  return a.id.localeCompare(b.id) || a.subjectId.localeCompare(b.subjectId);
}

function sortIds(values: string[]) {
  return values.sort((a, b) => a.localeCompare(b));
}
