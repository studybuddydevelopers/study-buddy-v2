import {
  Prisma,
  ResourceApprovalStatus,
  ResourceExtractionQuality,
  ResourceProcessingStatus,
  ResourceSourceKind,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPastQuestionChunk, hashContent } from "./chunking";
import { buildResourceChunkSearchText } from "./retrieval/search-text";

export interface LegacyPastQuestionForMigration {
  id: string;
  subjectId: string;
  topicId: string | null;
  questionText: string;
  answerText: string;
  explanationText: string | null;
  year: number | null;
  questionNumber: string | null;
  subject?: { id: string } | null;
  topic?: { id: string; subjectId: string } | null;
}

export interface PastQuestionMigrationDecision {
  pastQuestionId: string;
  action: "CREATE" | "SKIP_EXISTING" | "DRY_RUN_CREATE";
  approvalStatus: ResourceApprovalStatus;
  processingStatus: ResourceProcessingStatus;
  extractionQuality: ResourceExtractionQuality;
  contentHash: string;
  title: string;
  checks: Record<string, boolean>;
  warnings: string[];
}

export interface PastQuestionMigrationReport {
  dryRun: boolean;
  examined: number;
  scanned: number;
  created: number;
  skippedExisting: number;
  skippedExactDuplicate: number;
  possibleDuplicate: number;
  invalid: number;
  missingProvenance: number;
  missingRights: number;
  missingTopic: number;
  pendingReview: number;
  autoApproved: number;
  rejected: number;
  warnings: string[];
  failures: string[];
  decisions: PastQuestionMigrationDecision[];
}

interface MigrationInput {
  dryRun: boolean;
  limit?: number;
}

export async function migrateLegacyPastQuestions(
  input: MigrationInput
): Promise<PastQuestionMigrationReport> {
  const questions = await prisma.pastQuestion.findMany({
    take: input.limit,
    orderBy: [{ subjectId: "asc" }, { year: "asc" }, { questionNumber: "asc" }, { id: "asc" }],
    include: {
      subject: { select: { id: true } },
      topic: { select: { id: true, subjectId: true } },
    },
  });

  const decisions: PastQuestionMigrationDecision[] = [];
  let created = 0;
  let skippedExisting = 0;

  for (const question of questions) {
    const existing = await prisma.resource.findUnique({
      where: { legacyPastQuestionId: question.id },
      select: { id: true },
    });
    const duplicate = await prisma.resource.findFirst({
      where: {
        legacyPastQuestionId: { not: question.id },
        contentHash: buildLegacyPastQuestionHash(question),
      },
      select: { id: true },
    });
    const plan = buildLegacyPastQuestionMigrationDecision(question, {
      duplicateResourceId: duplicate?.id ?? null,
      alreadyMigrated: Boolean(existing),
      dryRun: input.dryRun,
    });

    decisions.push(plan);

    if (existing) {
      skippedExisting += 1;
      continue;
    }

    if (input.dryRun) continue;

    await createLegacyPastQuestionResource(question, plan, duplicate?.id ?? null);
    created += 1;
  }

  return {
    dryRun: input.dryRun,
    examined: questions.length,
    scanned: questions.length,
    created,
    skippedExisting,
    skippedExactDuplicate: skippedExisting,
    possibleDuplicate: decisions.filter((item) => !item.checks.duplication)
      .length,
    invalid: decisions.filter(
      (item) =>
        !item.checks.completeness ||
        !item.checks.subjectMapping ||
        !item.checks.topicPresent ||
        !item.checks.topicMapping ||
        !item.checks.usableExtractedContent
    ).length,
    missingProvenance: decisions.filter((item) => !item.checks.provenance)
      .length,
    missingRights: decisions.filter((item) => !item.checks.usageRights).length,
    missingTopic: decisions.filter((item) => !item.checks.topicPresent).length,
    pendingReview: decisions.filter(
      (item) => item.approvalStatus === ResourceApprovalStatus.PENDING_REVIEW
    ).length,
    autoApproved: decisions.filter(
      (item) => item.approvalStatus === ResourceApprovalStatus.APPROVED
    ).length,
    rejected: decisions.filter(
      (item) => item.approvalStatus === ResourceApprovalStatus.REJECTED
    ).length,
    warnings: Array.from(
      new Set(decisions.flatMap((item) => item.warnings))
    ).slice(0, 200),
    failures: [],
    decisions,
  };
}

export function buildLegacyPastQuestionMigrationDecision(
  question: LegacyPastQuestionForMigration,
  options: {
    duplicateResourceId?: string | null;
    alreadyMigrated?: boolean;
    dryRun?: boolean;
  } = {}
): PastQuestionMigrationDecision {
  const content = buildLegacyPastQuestionContent(question);
  const contentHash = hashContent(content);
  const checks = {
    provenance: false,
    completeness: Boolean(
      question.questionText.trim() && question.answerText.trim()
    ),
    subjectMapping: Boolean(question.subject?.id || question.subjectId),
    topicPresent: Boolean(question.topicId),
    topicMapping:
      !question.topicId || question.topic?.subjectId === question.subjectId,
    usableExtractedContent: content.trim().length >= 30,
    duplication: !options.duplicateResourceId,
    usageRights: false,
  };
  const warnings = collectLegacyPastQuestionWarnings(checks, options);
  const allChecksPass = Object.values(checks).every(Boolean);

  return {
    pastQuestionId: question.id,
    action: options.alreadyMigrated
      ? "SKIP_EXISTING"
      : options.dryRun
        ? "DRY_RUN_CREATE"
        : "CREATE",
    approvalStatus: allChecksPass
      ? ResourceApprovalStatus.APPROVED
      : ResourceApprovalStatus.PENDING_REVIEW,
    processingStatus: checks.usableExtractedContent
      ? ResourceProcessingStatus.PROCESSED
      : ResourceProcessingStatus.FAILED,
    extractionQuality: checks.usableExtractedContent
      ? ResourceExtractionQuality.HIGH
      : ResourceExtractionQuality.FAILED,
    contentHash,
    title: buildLegacyPastQuestionTitle(question),
    checks,
    warnings,
  };
}

export function buildLegacyPastQuestionContent(
  question: LegacyPastQuestionForMigration
) {
  return [
    buildLegacyPastQuestionTitle(question),
    "",
    question.questionText.trim(),
    "",
    `Answer: ${question.answerText.trim()}`,
    question.explanationText?.trim()
      ? `\nWorked solution: ${question.explanationText.trim()}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildLegacyPastQuestionHash(question: LegacyPastQuestionForMigration) {
  return hashContent(buildLegacyPastQuestionContent(question));
}

async function createLegacyPastQuestionResource(
  question: LegacyPastQuestionForMigration,
  decision: PastQuestionMigrationDecision,
  duplicateResourceId: string | null
) {
  const chunk = buildPastQuestionChunk({
    questionText: question.questionText,
    answerText: question.answerText,
    explanationText: question.explanationText,
    questionNumber: question.questionNumber,
  });
  const chunkSetHash = hashContent(
    JSON.stringify([
      {
        chunkIndex: chunk.chunkIndex,
        chunkType: chunk.chunkType,
        contentHash: chunk.contentHash,
      },
    ])
  );

  await prisma.resource.create({
    data: {
      sourceKind: ResourceSourceKind.LEGACY_PAST_QUESTION,
      title: decision.title,
      subjectId: question.subjectId,
      topicId: question.topicId,
      legacyPastQuestionId: question.id,
      contentHash: decision.contentHash,
      version: 1,
      activeChunkVersion: 1,
      activeChunkSetHash: chunkSetHash,
      processingStatus: decision.processingStatus,
      approvalStatus: decision.approvalStatus,
      extractionQuality: decision.extractionQuality,
      extractionWarnings: decision.warnings as Prisma.InputJsonValue,
      duplicateOfResourceId: duplicateResourceId,
      migrationReport: {
        checks: decision.checks,
        warnings: decision.warnings,
        autoApprovalPolicy:
          "Legacy past questions are approved automatically only when provenance, completeness, subject mapping, usable content, duplication, and usage-rights checks all pass.",
      } as Prisma.InputJsonValue,
      chunks: {
        create: {
          version: 1,
          subjectId: question.subjectId,
          topicId: question.topicId,
          chunkType: chunk.chunkType,
          chunkIndex: chunk.chunkIndex,
          title: chunk.title,
          content: chunk.content,
          tokenEstimate: chunk.tokenEstimate,
          questionNumber: chunk.questionNumber,
          contentHash: chunk.contentHash,
          searchText: buildResourceChunkSearchText({
            resource: {
              title: decision.title,
              sourceKind: ResourceSourceKind.LEGACY_PAST_QUESTION,
              subjectId: question.subjectId,
              topicId: question.topicId,
              contentHash: decision.contentHash,
            },
            chunk,
          }),
          metadata: chunk.metadata as Prisma.InputJsonValue,
        },
      },
    },
  });
}

function buildLegacyPastQuestionTitle(question: LegacyPastQuestionForMigration) {
  const parts = ["Past question"];
  if (question.year) parts.push(String(question.year));
  if (question.questionNumber) parts.push(`#${question.questionNumber}`);
  return parts.join(" ");
}

function collectLegacyPastQuestionWarnings(
  checks: Record<string, boolean>,
  options: { duplicateResourceId?: string | null; alreadyMigrated?: boolean }
) {
  const warnings: string[] = [];
  if (options.alreadyMigrated) warnings.push("Already migrated.");
  if (!checks.provenance) {
    warnings.push("Missing explicit provenance; admin review required.");
  }
  if (!checks.usageRights) {
    warnings.push("Missing explicit usage/access rights; admin review required.");
  }
  if (!checks.completeness) {
    warnings.push("Question text and answer text must both be present.");
  }
  if (!checks.subjectMapping) {
    warnings.push("Subject mapping could not be verified.");
  }
  if (!checks.topicPresent) {
    warnings.push("Missing topic; admin review required.");
  }
  if (!checks.topicMapping) {
    warnings.push("Topic does not belong to the question subject.");
  }
  if (!checks.topicMapping || !checks.subjectMapping) {
    warnings.push("Missing or invalid topic mapping; admin review required.");
  }
  if (!checks.usableExtractedContent) {
    warnings.push("Question content is too short to create a usable chunk.");
  }
  if (!checks.duplication) {
    warnings.push(
      `Potential duplicate of resource ${options.duplicateResourceId}; admin review required.`
    );
  }
  return warnings;
}
