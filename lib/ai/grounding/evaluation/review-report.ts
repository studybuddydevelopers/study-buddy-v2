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
} from "./types";

export const REVIEW_REPORT_SCHEMA_VERSION = "grounded-runtime-review-report-v1";
export const DEFAULT_REVIEW_REPORT_DIR = ".grounded-evaluation-reports";
export const GENERATED_ANSWER_REVIEW_CHAR_LIMIT = 12_000;
export const CITED_EXCERPT_CHAR_LIMIT = 700;

export interface BuildReviewCaseInput {
  evaluationCase: GroundedEvaluationCase;
  actualClassification: GroundedEvaluationClassification;
  generatedAnswerText: string;
  citations: GroundedEvaluationCitation[];
  citedExcerpts: GroundedEvaluationReviewCitation[];
  insufficiencyReason?: string | null;
  versions: GroundedEvaluationReviewCase["versions"];
  provider?: string | null;
  model?: string | null;
  repairUsed?: boolean;
  inputTokens?: number | null;
  outputTokens?: number | null;
}

export interface BuildReviewReportInput {
  runId: string;
  runTimestamp: string;
  fixtureHash: string;
  sourceState: GroundedEvaluationReportSourceState;
  frozenConfig: Record<string, unknown>;
  cases: GroundedEvaluationReviewCase[];
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
    requiredFacts,
    detectedRequiredFacts: findPresentPhrases(generatedAnswerText.value, requiredFacts),
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
  } satisfies GroundedEvaluationReviewCase;
}

export function buildReviewReport(input: BuildReviewReportInput) {
  const reportWithoutHash = {
    reportSchemaVersion: REVIEW_REPORT_SCHEMA_VERSION,
    runId: input.runId,
    runTimestamp: input.runTimestamp,
    fixtureHash: input.fixtureHash,
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
    `- Timestamp: \`${report.runTimestamp}\``,
    `- Fixture hash: \`${report.fixtureHash}\``,
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
      `- Answer hash: \`${item.answerContentHash}\``,
      `- Repair used: \`${String(item.repairUsed)}\``,
      `- Source labels: ${item.sourceLabels.map((label) => `\`${label}\``).join(", ") || "none"}`,
      `- Citation markers: ${item.citationMarkers.map((label) => `\`${label}\``).join(", ") || "none"}`,
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

    if (item.citedExcerpts.length > 0) {
      lines.push("Cited excerpts:", "");
      for (const citation of item.citedExcerpts) {
        lines.push(
          `- ${citation.sourceLabel} (${citation.resourceId ?? "unknown resource"} / ${citation.chunkId ?? "unknown chunk"}): ${citation.excerpt}`
        );
      }
      lines.push("");
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
  const normalized = value.toLowerCase();
  return phrases.filter((phrase) => normalized.includes(phrase.toLowerCase()));
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
