import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  GroundedEvaluationCase,
  GroundedEvaluationClassification,
  GroundedEvaluationCitation,
  GroundedEvaluationReportSourceState,
  GroundedEvaluationReviewCase,
  GroundedEvaluationReviewCitation,
  GroundedEvaluationReviewReport,
  GroundedEvaluationSplit,
} from "./types";
import {
  evaluationPhraseAppears,
  findPresentEvaluationFacts,
} from "./fact-matching";

export const REVIEW_REPORT_SCHEMA_VERSION = "grounded-runtime-review-report-v1.2";
export const DEFAULT_REVIEW_REPORT_DIR = ".grounded-evaluation-reports";
export const GENERATED_ANSWER_REVIEW_CHAR_LIMIT = 12_000;
export const CITED_EXCERPT_CHAR_LIMIT = 700;

export interface BuildReviewCaseInput {
  evaluationCase: GroundedEvaluationCase;
  actualClassification: GroundedEvaluationClassification;
  generatedAnswerText: string;
  citations: GroundedEvaluationCitation[];
  citedExcerpts: GroundedEvaluationReviewCitation[];
  answerSegments?: GroundedEvaluationReviewCase["answerSegments"];
  groundingValidatorResults?: GroundedEvaluationReviewCase["groundingValidatorResults"];
  regenerationUsed?: boolean;
  originalUnsupportedSegmentIndices?: number[];
  insufficiencyReason?: string | null;
  versions: GroundedEvaluationReviewCase["versions"];
  provider?: string | null;
  model?: string | null;
  repairUsed?: boolean;
  inputTokens?: number | null;
  outputTokens?: number | null;
  pipeline?: GroundedEvaluationReviewCase["pipeline"];
  capabilityDiagnostics?: GroundedEvaluationReviewCase["capabilityDiagnostics"];
}

export interface BuildReviewReportInput {
  split?: GroundedEvaluationSplit | "all";
  runId: string;
  runTimestamp: string;
  fixtureHash: string;
  splitHash?: string | null;
  sourceState: GroundedEvaluationReportSourceState;
  frozenConfig: Record<string, unknown>;
  cases: GroundedEvaluationReviewCase[];
  pipeline?: GroundedEvaluationReviewReport["pipeline"];
}

export interface WriteReviewArtifactsOptions {
  reportDir?: string;
  writeJson?: boolean;
  writeMarkdown?: boolean;
}

export function buildReviewCase(input: BuildReviewCaseInput) {
  const generatedAnswerText = boundedText(
    input.generatedAnswerText,
    GENERATED_ANSWER_REVIEW_CHAR_LIMIT
  );
  const citationMarkers = extractCitationMarkers(generatedAnswerText.value);
  const sourceLabels = Array.from(
    new Set(input.citations.map((citation) => citation.sourceLabel))
  );
  const requiredFacts = input.evaluationCase.requiredFacts ?? [];
  const forbiddenClaims = input.evaluationCase.forbiddenClaims ?? [];

  return {
    caseId: input.evaluationCase.id,
    userQuery: input.evaluationCase.messages.at(-1)?.content ?? "",
    expectedClassification: input.evaluationCase.shouldAnswer
      ? "SUPPORTED"
      : "INSUFFICIENT_CONTEXT",
    actualClassification: input.actualClassification,
    generatedAnswerText: generatedAnswerText.value,
    generatedAnswerTruncated: generatedAnswerText.truncated,
    answerContentHash: hashText(generatedAnswerText.value),
    citationMarkers,
    sourceLabels,
    citations: input.citations,
    citedExcerpts: input.citedExcerpts.map(boundReviewCitationExcerpt),
    answerSegments: (input.answerSegments ?? []).map(boundReviewAnswerSegment),
    groundingValidatorResults: (input.groundingValidatorResults ?? []).map(
      boundGroundingValidatorResult
    ),
    regenerationUsed: input.regenerationUsed === true,
    originalUnsupportedSegmentIndices:
      input.originalUnsupportedSegmentIndices?.slice(0, 32) ?? [],
    finalAcceptedSegments: (input.answerSegments ?? []).map(boundReviewAnswerSegment),
    groundingValidatorVersion:
      input.groundingValidatorResults?.find((item) => item.validatorVersion)
        ?.validatorVersion ?? null,
    requiredFacts,
    detectedRequiredFacts: findPresentEvaluationFacts(
      generatedAnswerText.value,
      requiredFacts
    ),
    forbiddenClaims,
    detectedForbiddenClaims: findPresentPhrases(generatedAnswerText.value, forbiddenClaims),
    insufficiencyReason: input.insufficiencyReason ?? null,
    versions: input.versions,
    provider: input.provider ?? null,
    model: input.model ?? null,
    repairUsed: input.repairUsed === true,
    tokenUsage: {
      inputTokens: validNonNegative(input.inputTokens),
      outputTokens: validNonNegative(input.outputTokens),
    },
    pipeline: input.pipeline,
    capabilityDiagnostics: input.capabilityDiagnostics,
  } satisfies GroundedEvaluationReviewCase;
}

export function buildReviewReport(input: BuildReviewReportInput) {
  const reportWithoutHash = {
    reportSchemaVersion: REVIEW_REPORT_SCHEMA_VERSION,
    pipeline: input.pipeline,
    split: input.split ?? inferReportSplit(input.cases),
    runId: input.runId,
    runTimestamp: input.runTimestamp,
    fixtureHash: input.fixtureHash,
    splitHash: input.splitHash ?? null,
    sourceState: input.sourceState,
    frozenConfig: input.frozenConfig,
    caseCount: input.cases.length,
    cases: input.cases,
    reportHash: "",
  } satisfies GroundedEvaluationReviewReport;

  return {
    ...reportWithoutHash,
    reportHash: hashReviewReport(reportWithoutHash),
  } satisfies GroundedEvaluationReviewReport;
}

function inferReportSplit(cases: GroundedEvaluationReviewCase[]) {
  const splits = Array.from(
    new Set(
      cases.map((item) =>
        item.caseId.startsWith("holdout-v5-")
          ? "holdout_v5"
          : item.caseId.startsWith("holdout-v4-")
            ? "holdout_v4"
            : item.caseId.startsWith("holdout-v3-")
              ? "holdout_v3"
              : null
      )
    )
  ).filter((item): item is NonNullable<typeof item> => item !== null);

  if (splits.length === 0) return null;
  if (splits.length === 1) return splits[0];
  return "mixed";
}

export function verifyReviewReportIntegrity(
  report: GroundedEvaluationReviewReport
) {
  const caseHashesValid = report.cases.every(
    (item) => item.answerContentHash === hashText(item.generatedAnswerText)
  );
  return caseHashesValid && report.reportHash === hashReviewReport(report);
}

export function hashReviewReport(report: GroundedEvaluationReviewReport) {
  const canonical = {
    ...report,
    reportHash: "",
  };
  return hashText(JSON.stringify(canonical));
}

export async function writeReviewArtifacts(
  report: GroundedEvaluationReviewReport,
  options: WriteReviewArtifactsOptions = {}
) {
  const reportDir = path.resolve(
    process.cwd(),
    options.reportDir ?? DEFAULT_REVIEW_REPORT_DIR
  );
  await fs.mkdir(reportDir, { recursive: true });

  const writeJson = options.writeJson !== false;
  const writeMarkdown = options.writeMarkdown === true;
  const written: { jsonPath?: string; markdownPath?: string } = {};

  if (writeJson) {
    const jsonPath = path.join(reportDir, `${safeFileName(report.runId)}.redacted.json`);
    await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    written.jsonPath = jsonPath;
  }

  if (writeMarkdown) {
    const markdownPath = path.join(reportDir, `${safeFileName(report.runId)}.md`);
    await fs.writeFile(markdownPath, toReviewMarkdown(report), "utf8");
    written.markdownPath = markdownPath;
  }

  return written;
}

export function toReviewMarkdown(report: GroundedEvaluationReviewReport) {
  const lines = [
    `# Grounded Evaluation Review ${report.runId}`,
    "",
    `- Schema: \`${report.reportSchemaVersion}\``,
    `- Pipeline: \`${report.pipeline ?? "legacy"}\``,
    `- Timestamp: \`${report.runTimestamp}\``,
    `- Fixture hash: \`${report.fixtureHash}\``,
    `- Split hash: \`${report.splitHash ?? "not recorded"}\``,
    `- Report hash: \`${report.reportHash}\``,
    `- Commit: \`${report.sourceState.commit ?? "unknown"}\``,
    `- Diff hash: \`${report.sourceState.diffHash}\``,
    `- Dirty source: \`${String(report.sourceState.dirty)}\``,
    `- Cases: \`${report.caseCount}\``,
    "",
  ];

  for (const item of report.cases) {
    lines.push(
      `## ${item.caseId}`,
      "",
      `- Query: ${item.userQuery}`,
      `- Expected: \`${item.expectedClassification}\``,
      `- Actual: \`${item.actualClassification}\``,
      `- Pipeline: \`${item.pipeline ?? "legacy"}\``,
      `- Answer hash: \`${item.answerContentHash}\``,
      `- Repair used: \`${String(item.repairUsed)}\``,
      `- Regeneration used: \`${String(item.regenerationUsed)}\``,
      `- Source labels: ${item.sourceLabels.map((label) => `\`${label}\``).join(", ") || "none"}`,
      `- Citation markers: ${item.citationMarkers.map((label) => `\`${label}\``).join(", ") || "none"}`,
      `- Grounding validator: \`${item.groundingValidatorVersion ?? "none"}\``,
      `- Original unsupported segments: ${item.originalUnsupportedSegmentIndices.join(", ") || "none"}`,
      `- Required facts: ${item.requiredFacts.join(", ") || "none"}`,
      `- Detected required facts: ${item.detectedRequiredFacts.join(", ") || "none"}`,
      `- Forbidden claims: ${item.forbiddenClaims.join(", ") || "none"}`,
      `- Detected forbidden claims: ${item.detectedForbiddenClaims.join(", ") || "none"}`,
      "",
      "Answer:",
      "",
      "```text",
      item.generatedAnswerText,
      "```",
      ""
    );

    if (item.answerSegments.length > 0) {
      lines.push("Answer segments:", "");
      for (const segment of item.answerSegments) {
        lines.push(
          `- ${segment.index}: ${segment.text} (${segment.sourceLabels.join(", ") || "no sources"})`
        );
      }
      lines.push("");
    }

    if (item.groundingValidatorResults.length > 0) {
      lines.push("Grounding validation:", "");
      for (const result of item.groundingValidatorResults) {
        lines.push(
          `- ${result.index}: ${result.reason}; supported=${String(result.supported)}; unsupportedTerms=${result.unsupportedTerms.join(", ") || "none"}`
        );
      }
      lines.push("");
    }

    if (item.citedExcerpts.length > 0) {
      lines.push("Cited excerpts:", "");
      for (const citation of item.citedExcerpts) {
        lines.push(
          `- ${citation.sourceLabel} (${citation.resourceId ?? "unknown resource"} / ${citation.chunkId ?? "unknown chunk"}): ${citation.excerpt}`
        );
      }
      lines.push("");
    }

    if (item.capabilityDiagnostics) {
      lines.push(
        "Capability diagnostics:",
        "",
        `- Provider called: \`${String(item.capabilityDiagnostics.providerCalled)}\``,
        `- Final classification: \`${item.capabilityDiagnostics.finalClassification}\``,
        `- Evidence units: \`${item.capabilityDiagnostics.validatedEvidenceUnits.length}\``,
        `- Conflicts: \`${item.capabilityDiagnostics.detectedConflicts.length}\``,
        ""
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export function boundedExcerpt(value: string) {
  return boundedText(value, CITED_EXCERPT_CHAR_LIMIT);
}

function boundReviewCitationExcerpt(
  citation: GroundedEvaluationReviewCitation
): GroundedEvaluationReviewCitation {
  const excerpt = boundedExcerpt(citation.excerpt);
  return {
    ...citation,
    excerpt: excerpt.value,
    excerptTruncated: citation.excerptTruncated || excerpt.truncated,
  };
}

function boundReviewAnswerSegment<T extends { text: string }>(segment: T): T {
  const text = boundedText(segment.text, 1200);
  return {
    ...segment,
    text: text.value,
  };
}

function boundGroundingValidatorResult<
  T extends { text: string; unsupportedTerms: string[] },
>(result: T): T {
  return {
    ...boundReviewAnswerSegment(result),
    unsupportedTerms: result.unsupportedTerms.slice(0, 40),
  };
}

function boundedText(value: string, limit: number) {
  if (value.length <= limit) return { value, truncated: false };
  return {
    value: value.slice(0, Math.max(0, limit - 20)) + "\n[truncated]",
    truncated: true,
  };
}

function extractCitationMarkers(value: string) {
  return Array.from(
    new Set(
      Array.from(value.matchAll(/\[SOURCE_[1-9][0-9]*\]/g)).map((match) =>
        match[0].slice(1, -1)
      )
    )
  );
}

function findPresentPhrases(value: string, phrases: string[]) {
  return phrases.filter((phrase) => evaluationPhraseAppears(value, phrase));
}

function validNonNegative(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").slice(0, 120);
}

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
