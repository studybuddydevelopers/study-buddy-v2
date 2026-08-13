import fs from "node:fs/promises";
import { groundedEvaluationCases } from "@/lib/ai/grounding/evaluation/fixtures";
import {
  runRuntimeGroundedEvaluation,
  runRuntimeGroundedEvaluationPreflight,
} from "@/lib/ai/grounding/evaluation/runtime-runner";
import { runGroundedEvaluation } from "@/lib/ai/grounding/evaluation/runner";
import {
  DEFAULT_REVIEW_REPORT_DIR,
  writeReviewArtifacts,
} from "@/lib/ai/grounding/evaluation/review-report";
import type {
  GroundedEvaluationAnswer,
} from "@/lib/ai/grounding/evaluation/runner";
import type {
  GroundedEvaluationCase,
  GroundedEvaluationSplit,
} from "@/lib/ai/grounding/evaluation/types";

interface Args {
  answersFile?: string;
  split: GroundedEvaluationSplit | "all";
  caseIds?: string[];
  fixtureBaseline: boolean;
  allowConsumedHoldoutDiagnostic: boolean;
  confirmHoldoutFixtureHash?: string;
  maxCases?: number;
  writeReport: boolean;
  reportDir?: string;
  reportFormat: "json" | "markdown" | "both";
  dryRun: boolean;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.dryRun) {
    const report = await runRuntimeGroundedEvaluationPreflight({
      split: args.split,
      caseIds: args.caseIds,
      allowConsumedHoldoutDiagnostic: args.allowConsumedHoldoutDiagnostic,
      confirmHoldoutFixtureHash: args.confirmHoldoutFixtureHash,
      maxCases: args.maxCases,
      reportDir: args.reportDir,
    });
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (!args.answersFile && !args.fixtureBaseline) {
    const report = await runRuntimeGroundedEvaluation({
      split: args.split,
      caseIds: args.caseIds,
      allowConsumedHoldoutDiagnostic: args.allowConsumedHoldoutDiagnostic,
      confirmHoldoutFixtureHash: args.confirmHoldoutFixtureHash,
      maxCases: args.maxCases,
      reportDir: args.reportDir,
    });
    if (args.writeReport) {
      const written = await writeReviewArtifacts(report.review, {
        reportDir: args.reportDir,
        writeJson: args.reportFormat === "json" || args.reportFormat === "both",
        writeMarkdown:
          args.reportFormat === "markdown" || args.reportFormat === "both",
      });
      console.error(
        JSON.stringify({
          reviewReportDir: args.reportDir ?? DEFAULT_REVIEW_REPORT_DIR,
          ...written,
        })
      );
    }
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const answers = args.answersFile ? await readAnswers(args.answersFile) : null;
  const report = await runGroundedEvaluation({
    cases: groundedEvaluationCases,
    split: args.split,
    answerCase: async (evaluationCase) => {
      if (!answers) {
        return buildFixtureBaselineAnswer(evaluationCase);
      }
      const answer = answers.get(evaluationCase.id);
      if (!answer) {
        throw new Error(`Missing grounded answer for case ${evaluationCase.id}.`);
      }
      return answer;
    },
  });

  console.log(JSON.stringify(report, null, 2));
}

function parseArgs(values: string[]): Args {
  return {
    answersFile: readStringArg(values, "--answers"),
    split: readSplit(values),
    caseIds: readListArg(values, "--case"),
    fixtureBaseline: values.includes("--fixture-baseline"),
    allowConsumedHoldoutDiagnostic: values.includes("--diagnostic-consumed-holdout"),
    confirmHoldoutFixtureHash: readStringArg(values, "--confirm-holdout-fixture-hash"),
    maxCases: readOptionalNumberArg(values, "--max-cases"),
    writeReport: values.includes("--write-report"),
    reportDir: readStringArg(values, "--report-dir"),
    reportFormat: readReportFormat(values),
    dryRun: values.includes("--dry-run"),
  };
}

function readListArg(values: string[], name: string) {
  const directValues = values
    .filter((item) => item.startsWith(`${name}=`))
    .map((item) => item.slice(name.length + 1));
  if (directValues.length === 0) return undefined;

  const ids = directValues
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return ids.length > 0 ? Array.from(new Set(ids)) : undefined;
}

function readStringArg(values: string[], name: string) {
  const value = values.find((item) => item.startsWith(`${name}=`));
  return value ? value.slice(name.length + 1) : undefined;
}

function readSplit(values: string[]): GroundedEvaluationSplit | "all" {
  const value = readStringArg(values, "--split");
  if (
    value === "development" ||
    value === "regression" ||
    value === "holdout" ||
    value === "holdout_v2" ||
    value === "manual_quality" ||
    value === "holdout_v3" ||
    value === "holdout_v4" ||
    value === "holdout_v5" ||
    value === "adversarial_safety"
  ) {
    return value;
  }
  return "all";
}

function readReportFormat(values: string[]) {
  const value = readStringArg(values, "--report-format");
  if (value === "json" || value === "markdown" || value === "both") {
    return value;
  }
  return "both";
}

function readOptionalNumberArg(values: string[], name: string) {
  const value = readStringArg(values, name);
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

async function readAnswers(filePath: string) {
  const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("Grounded answer file must contain a JSON array.");
  }

  return new Map(
    parsed.map((item) => {
      const normalized = normalizeAnswer(item);
      return [normalized.caseId, normalized.answer] as const;
    })
  );
}

function normalizeAnswer(input: unknown): {
  caseId: GroundedEvaluationCase["id"];
  answer: GroundedEvaluationAnswer;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Each grounded answer row must be an object.");
  }
  const row = input as Record<string, unknown>;
  if (typeof row.caseId !== "string") {
    throw new Error("Each grounded answer row requires caseId.");
  }
  if (typeof row.answer !== "string") {
    throw new Error(`Grounded answer ${row.caseId} requires answer.`);
  }

  return {
    caseId: row.caseId,
    answer: {
      answer: row.answer,
      insufficientContext: row.insufficientContext === true,
      citations: Array.isArray(row.citations)
        ? row.citations
            .filter((citation) => citation && typeof citation === "object")
            .map((citation) => {
              const record = citation as Record<string, unknown>;
              return {
                sourceLabel:
                  typeof record.sourceLabel === "string"
                    ? record.sourceLabel
                    : "",
                resourceId:
                  typeof record.resourceId === "string"
                    ? record.resourceId
                    : undefined,
                chunkId:
                  typeof record.chunkId === "string"
                    ? record.chunkId
                    : undefined,
                subjectId:
                  typeof record.subjectId === "string"
                    ? record.subjectId
                    : undefined,
                topicId:
                  typeof record.topicId === "string"
                    ? record.topicId
                    : undefined,
              };
            })
        : [],
      structuredOutputFailed: row.structuredOutputFailed === true,
      repairAttempted: row.repairAttempted === true,
      retrievalLatencyMs: readOptionalNumber(row.retrievalLatencyMs),
      generationLatencyMs: readOptionalNumber(row.generationLatencyMs),
      inputTokens: readOptionalNumber(row.inputTokens),
      outputTokens: readOptionalNumber(row.outputTokens),
      estimatedCostUsd: readOptionalNumber(row.estimatedCostUsd),
    },
  };
}

function buildFixtureBaselineAnswer(
  evaluationCase: GroundedEvaluationCase
): GroundedEvaluationAnswer {
  if (!evaluationCase.shouldAnswer) {
    return {
      answer:
        "I do not have enough approved StudyBuddy material to answer that reliably.",
      insufficientContext: true,
      citations: [],
    };
  }

  return {
    answer: `Supported fixture answer ${(evaluationCase.requiredFacts ?? []).join(" ")} [SOURCE_1]`,
    insufficientContext: false,
    citations: [
      {
        sourceLabel: "SOURCE_1",
        resourceId: evaluationCase.expectedResourceIds?.[0],
        chunkId: evaluationCase.expectedChunkIds?.[0],
        subjectId: evaluationCase.subjectId,
        topicId: evaluationCase.topicId,
      },
    ],
    structuredOutputFailed: false,
    repairAttempted: false,
    retrievalLatencyMs: 0,
    generationLatencyMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
  };
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Grounded evaluation failed."
  );
  process.exitCode = 1;
});
