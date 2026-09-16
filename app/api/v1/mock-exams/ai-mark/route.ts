import { AiGenerationFailureCode, MockExamFormat } from "@prisma/client";
import { NextResponse } from "next/server";
import { getChatModelProvider } from "@/lib/ai/chat/provider";
import { ChatProviderError } from "@/lib/ai/chat/errors";
import { supportsStructuredGeneration } from "@/lib/ai/chat/types";
import { requireAiUser } from "@/lib/auth";
import {
  buildAiMarkingMessages,
  buildAiMarkingOutputSchema,
  parseAiMarkingDecisions,
  validateAiMarkingInputs,
  type WrittenAnswerForAiMarking,
} from "@/lib/mock-exam-ai-marking";
import {
  getScoredWrittenAnswers,
  getWrittenSubmissionError,
} from "@/lib/mock-exam-written";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { enforceAiRequestLimits } from "@/lib/security/rate-limit";
import {
  parseJsonObjectRequest,
  REQUEST_LIMITS,
} from "@/lib/security/request-body";

export const maxDuration = 30;

export async function POST(request: Request) {
  const auth = await requireAiUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { dbUser } = auth;

  const parsedBody = await parseJsonObjectRequest(request, REQUEST_LIMITS.aiJson);
  if (!parsedBody.ok) return parsedBody.response;

  const instanceId =
    typeof parsedBody.data.instanceId === "string"
      ? parsedBody.data.instanceId.trim()
      : "";
  if (!instanceId) {
    return noStoreJson({ error: "instanceId is required" }, 400);
  }

  const instance = await prisma.mockExamInstance.findUnique({
    where: { id: instanceId },
    include: {
      template: { select: { format: true, totalMarks: true } },
      answers: {
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        include: {
          question: {
            select: {
              questionText: true,
              answerText: true,
              explanationText: true,
            },
          },
        },
      },
    },
  });

  if (!instance) {
    return noStoreJson({ error: "Mock exam instance not found" }, 404);
  }
  if (instance.userId !== dbUser.id) {
    return noStoreJson({ error: "Forbidden" }, 403);
  }
  if (instance.template.format !== MockExamFormat.WRITTEN) {
    return noStoreJson(
      { error: "AI-assisted marking is only available for written mock exams" },
      400
    );
  }
  if (!instance.submittedAt) {
    return noStoreJson(
      { error: "Submit the written paper before requesting AI marking" },
      400
    );
  }
  if (instance.graded) {
    return noStoreJson(
      { error: "This written paper has already been marked" },
      409
    );
  }

  const submissionError = getWrittenSubmissionError(instance.answers);
  if (submissionError) {
    return noStoreJson({ error: submissionError }, 400);
  }

  const answers: WrittenAnswerForAiMarking[] = getScoredWrittenAnswers(
    instance.answers
  ).map((answer) => ({
    answerId: answer.id,
    questionText: answer.question.questionText,
    learnerAnswer: answer.userAnswer?.trim() ?? "",
    modelAnswer: answer.question.answerText,
    markingGuide: answer.question.explanationText ?? "",
    maxScore: answer.maxScore,
  }));

  const inputError = validateAiMarkingInputs(answers);
  if (inputError) {
    return noStoreJson({ error: inputError }, 400);
  }

  let provider;
  try {
    provider = getChatModelProvider();
  } catch (error) {
    logMarkingFailure(instanceId, error);
    return providerErrorResponse(error);
  }

  if (!supportsStructuredGeneration(provider)) {
    return noStoreJson(
      {
        error:
          "AI marking is temporarily unavailable. Try again or contact Study Buddy.",
      },
      503
    );
  }

  const aiLimitResponse = await enforceAiRequestLimits({
    accountId: dbUser.id,
    requestHeaders: request.headers,
  });
  if (aiLimitResponse) return aiLimitResponse;

  try {
    const result = await provider.generateStructured({
      messages: buildAiMarkingMessages(answers),
      outputSchema: buildAiMarkingOutputSchema(answers.length),
      temperature: 0,
      maxOutputTokens: 2_000,
    });
    const parsedMarks = parseAiMarkingDecisions(result.value, answers);

    if (!parsedMarks.ok) {
      logSecurityEvent("ai_mock_exam_invalid_marking_response", "warn", {
        instanceId,
      });
      return noStoreJson({ error: parsedMarks.error }, 502);
    }

    const totalScore = parsedMarks.marks.reduce(
      (sum, mark) => sum + mark.score,
      0
    );
    const totalMarks =
      instance.template.totalMarks ??
      answers.reduce((sum, answer) => sum + answer.maxScore, 0);
    if (totalScore > totalMarks) {
      logSecurityEvent("ai_mock_exam_invalid_marking_total", "warn", {
        instanceId,
      });
      return noStoreJson(
        { error: "The AI returned an invalid total. No marks were saved." },
        502
      );
    }

    try {
      await prisma.$transaction(async (transaction) => {
        const claim = await transaction.mockExamInstance.updateMany({
          where: {
            id: instanceId,
            userId: dbUser.id,
            graded: false,
            submittedAt: { not: null },
          },
          data: { graded: true, totalScore },
        });
        if (claim.count !== 1) throw new MarkingAlreadyCompletedError();

        for (const mark of parsedMarks.marks) {
          const source = answers.find(
            (answer) => answer.answerId === mark.answerId
          )!;
          await transaction.mockExamAnswer.update({
            where: { id: mark.answerId },
            data: {
              score: mark.score,
              isCorrect: mark.score === source.maxScore,
              aiExplanation: formatAiExplanation(mark),
            },
          });
        }
      });
    } catch (error) {
      if (error instanceof MarkingAlreadyCompletedError) {
        return noStoreJson(
          { error: "This written paper has already been marked" },
          409
        );
      }
      throw error;
    }

    return noStoreJson({
      instanceId,
      graded: true,
      totalScore,
      totalMarks,
      answers: parsedMarks.marks.map((mark) => ({
        id: mark.answerId,
        score: mark.score,
        isCorrect:
          mark.score ===
          answers.find((answer) => answer.answerId === mark.answerId)!.maxScore,
        aiExplanation: formatAiExplanation(mark),
      })),
      message: "Your written paper has been marked by Study Buddy AI.",
    });
  } catch (error) {
    logMarkingFailure(instanceId, error);
    return providerErrorResponse(error);
  }
}

function logMarkingFailure(instanceId: string, error: unknown) {
  logSecurityEvent("ai_mock_exam_marking_failed", "error", {
    instanceId,
    failureCode:
      error instanceof ChatProviderError ? error.failureCode : "INTERNAL_ERROR",
  });
}

function providerErrorResponse(error: unknown) {
  const fallbackMessage =
    "AI marking is temporarily unavailable. Try again or contact Study Buddy.";

  if (error instanceof ChatProviderError) {
    if (error.failureCode === AiGenerationFailureCode.RATE_LIMITED) {
      return noStoreJson({ error: fallbackMessage }, 429);
    }
    if (error.failureCode === AiGenerationFailureCode.PROVIDER_TIMEOUT) {
      return noStoreJson({ error: fallbackMessage }, 504);
    }
    if (
      error.failureCode === AiGenerationFailureCode.INVALID_PROVIDER_RESPONSE
    ) {
      return noStoreJson(
        {
          error:
            "The AI returned incomplete marks. No marks were saved.",
        },
        502
      );
    }
  }

  return noStoreJson({ error: fallbackMessage }, 503);
}

function formatAiExplanation(mark: {
  rationale: string;
  confidence: string;
}) {
  return `${mark.rationale} (${mark.confidence.toLowerCase()} confidence)`;
}

class MarkingAlreadyCompletedError extends Error {}

function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
