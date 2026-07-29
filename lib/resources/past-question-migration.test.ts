import { describe, expect, it } from "vitest";
import {
  ResourceApprovalStatus,
  ResourceProcessingStatus,
} from "@prisma/client";
import {
  buildLegacyPastQuestionContent,
  buildLegacyPastQuestionMigrationDecision,
} from "./past-question-migration";

describe("Stage 2 legacy past-question migration planning", () => {
  const question = {
    id: "question-1",
    subjectId: "subject-1",
    topicId: "topic-1",
    questionText: "Solve 2x = 10.",
    answerText: "x = 5",
    explanationText: "Divide both sides by 2.",
    year: 2024,
    questionNumber: "4",
    subject: { id: "subject-1" },
    topic: { id: "topic-1", subjectId: "subject-1" },
  };

  it("creates a complete content unit that keeps question, answer, and solution together", () => {
    const content = buildLegacyPastQuestionContent(question);

    expect(content).toContain("Solve 2x = 10.");
    expect(content).toContain("Answer: x = 5");
    expect(content).toContain("Worked solution: Divide both sides by 2.");
  });

  it("does not auto-approve legacy questions without provenance and usage rights", () => {
    const decision = buildLegacyPastQuestionMigrationDecision(question, {
      dryRun: true,
    });

    expect(decision.action).toBe("DRY_RUN_CREATE");
    expect(decision.processingStatus).toBe(ResourceProcessingStatus.PROCESSED);
    expect(decision.approvalStatus).toBe(
      ResourceApprovalStatus.PENDING_REVIEW
    );
    expect(decision.checks.provenance).toBe(false);
    expect(decision.checks.usageRights).toBe(false);
    expect(decision.warnings.join(" ")).toContain("admin review");
  });

  it("flags duplicate legacy content for admin review", () => {
    const decision = buildLegacyPastQuestionMigrationDecision(question, {
      duplicateResourceId: "resource-1",
    });

    expect(decision.checks.duplication).toBe(false);
    expect(decision.warnings.join(" ")).toContain("Potential duplicate");
  });
});
