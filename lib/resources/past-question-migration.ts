import {
  Prisma,
  ResourceApprovalStatus,
  ResourceExtractionQuality,
  ResourceProcessingStatus,
  ResourceSourceKind,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPastQuestionChunk, hashContent } from "./chunking";

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
  scanned: number;
  created: number;
  skippedExisting: number;
  pendingReview: number;
  autoApproved: number;
  rejected: number;
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
    scanned: questions.length,
    created,
    skippedExisting,
    pendingReview: decisions.filter(
      (item) => item.approvalStatus === ResourceApprovalStatus.PENDING_REVIEW
    ).length,
    autoApproved: decisions.filter(
      (item) => item.approvalStatus === ResourceApprovalStatus.APPROVED
    ).length,
    rejected: decisions.filter(
      (item) => item.approvalStatus === ResourceApprovalStatus.REJECTED
    ).length,
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

  await prisma.resource.create({
    data: {
      sourceKind: ResourceSourceKind.LEGACY_PAST_QUESTION,
      title: decision.title,
      subjectId: question.subjectId,
      topicId: question.topicId,
      legacyPastQuestionId: question.id,
      contentHash: decision.contentHash,
      version: 1,
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
          subjectId: question.subjectId,
          topicId: question.topicId,
          chunkType: chunk.chunkType,
          chunkIndex: chunk.chunkIndex,
          title: chunk.title,
          content: chunk.content,
          tokenEstimate: chunk.tokenEstimate,
          questionNumber: chunk.questionNumber,
          contentHash: chunk.contentHash,
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
  if (!checks.topicMapping) {
    warnings.push("Topic does not belong to the question subject.");
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
