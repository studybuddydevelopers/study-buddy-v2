import { AiGenerationFailureCode } from "@prisma/client";
import { ChatProviderError, getSafeProviderFailureCode } from "@/lib/ai/chat/errors";
import type {
  ChatModelProvider,
  GenerateMessage,
  GenerateUsage,
  StructuredChatModelProvider,
} from "@/lib/ai/chat/types";
import { supportsStructuredGeneration } from "@/lib/ai/chat/types";
import { getConfiguredEmbeddingProvider } from "@/lib/ai/embeddings/provider";
import type { EmbeddingProvider } from "@/lib/ai/embeddings/types";
import { PostgresResourceSearchRepository } from "@/lib/resources/retrieval/postgres-resource-search-repository";
import type {
  ResourceSearchRepository,
} from "@/lib/resources/retrieval/types";
import { classifyGroundedMessage, type GroundedMessageCategory } from "./classification";
import {
  GROUNDED_PROMPT_VERSION,
  GROUNDING_VERSION,
  SUFFICIENCY_POLICY_VERSION,
} from "./config";
import {
  buildSelectedEvidenceMetadata,
  selectGroundingEvidence,
  type LabeledEvidence,
} from "./evidence";
import { buildGroundedTeachPrompt, groundedTeachOutputSchema } from "./prompt";
import { buildStandaloneRetrievalQuery } from "./query-builder";
import {
  evaluateRetrievalSufficiency,
  type GroundingConfidence,
  type SufficiencyReason,
} from "./sufficiency";
import {
  GroundedOutputValidationError,
  validateGroundedTeachOutput,
} from "./structured-output";

export interface GroundedChatContext {
  chatId: string;
  userMessageId: string;
  assistantMessageId: string;
  generationRequestId: string;
  attemptNumber: number;
  userMessage: string;
  subjectId?: string | null;
  subjectName?: string | null;
  topicId?: string | null;
  topicTitle?: string | null;
  recentMessages: Array<{ role: "USER" | "ASSISTANT"; content: string }>;
}

export interface GroundingAttemptDraft {
  retrievalQuery: string;
  embeddingConfigurationId: string | null;
  sufficiencyStatus: "SUFFICIENT" | "INSUFFICIENT";
  sufficiencyReason: SufficiencyReason;
  confidence: GroundingConfidence;
  selectedEvidenceMetadata: unknown;
  groundingVersion: string;
  promptVersion: string;
  sufficiencyPolicyVersion: string;
  retrievalDurationMs?: number;
  generationDurationMs?: number;
}

export type GroundedGenerationOutcome =
  | {
      kind: "COMPLETED";
      content: string;
      provider: string;
      model: string;
      usage?: GenerateUsage;
      insufficientContext: false;
      attempt: GroundingAttemptDraft;
      citations: Array<{ sourceLabel: string; evidence: LabeledEvidence }>;
    }
  | {
      kind: "INSUFFICIENT_CONTEXT";
      content: string;
      insufficientContext: true;
      attempt: GroundingAttemptDraft;
      citations: [];
    }
  | {
      kind: "DETERMINISTIC";
      content: string;
      category: "CONVERSATIONAL" | "UNSUPPORTED_MODE";
    }
  | {
      kind: "FAILED";
      failureCode: AiGenerationFailureCode;
      attempt?: GroundingAttemptDraft;
    };

interface GroundedGenerationServiceOptions {
  searchRepository?: ResourceSearchRepository;
  embeddingProvider?: EmbeddingProvider;
  now?: () => number;
}

const RETRIEVAL_CANDIDATE_LIMIT = 20;
const BRANCH_CANDIDATE_LIMIT = 40;
const GROUNDED_MAX_OUTPUT_TOKENS = 700;

export class GroundedGenerationService {
  constructor(private readonly options: GroundedGenerationServiceOptions = {}) {}

  async generate(input: {
    context: GroundedChatContext;
    provider: ChatModelProvider;
  }): Promise<GroundedGenerationOutcome> {
    const category = classifyGroundedMessage({
      message: input.context.userMessage,
      recentMessages: input.context.recentMessages,
    });

    if (category === "CONVERSATIONAL") {
      return {
        kind: "DETERMINISTIC",
        category,
        content: "Hi. Ask me a study question and I’ll explain it step by step.",
      };
    }

    if (category === "UNSUPPORTED_MODE") {
      return {
        kind: "DETERMINISTIC",
        category,
        content:
          "I can help in TEACH mode right now by explaining concepts from approved StudyBuddy material. Hint, solve, and mark modes are not available yet.",
      };
    }

    return this.generateSubstantiveAnswer(input.context, input.provider, category);
  }

  private async generateSubstantiveAnswer(
    context: GroundedChatContext,
    provider: ChatModelProvider,
    category: GroundedMessageCategory
  ): Promise<GroundedGenerationOutcome> {
    void category;
    const searchRepository =
      this.options.searchRepository ?? new PostgresResourceSearchRepository();
    const retrievalStartedAt = this.now();
    const retrievalQuery = buildStandaloneRetrievalQuery({
      message: context.userMessage,
      subjectName: context.subjectName,
      topicTitle: context.topicTitle,
      recentMessages: context.recentMessages,
    });

    let activeConfigurationId: string | null = null;
    let queryEmbedding: number[] | undefined;

    try {
      const activeConfiguration = await searchRepository.getActiveEmbeddingConfiguration();
      activeConfigurationId = activeConfiguration?.id ?? null;
      if (activeConfiguration) {
        const embeddingProvider =
          this.options.embeddingProvider ?? getConfiguredEmbeddingProvider();
        queryEmbedding = await embeddingProvider.embedQuery(retrievalQuery);
      }

      const candidates = await searchRepository.hybridSearch({
        query: retrievalQuery,
        queryEmbedding,
        filters: {
          ...(context.subjectId ? { subjectId: context.subjectId } : {}),
          ...(context.topicId ? { topicId: context.topicId } : {}),
        },
        keywordLimit: BRANCH_CANDIDATE_LIMIT,
        vectorLimit: BRANCH_CANDIDATE_LIMIT,
        limit: RETRIEVAL_CANDIDATE_LIMIT,
      });
      const evidence = selectGroundingEvidence({ candidates });
      const sufficiency = evaluateRetrievalSufficiency({
        query: retrievalQuery,
        candidates,
        selectedChunks: evidence.map((item) => item.chunk),
        subjectId: context.subjectId,
        topicId: context.topicId,
      });
      const retrievalDurationMs = elapsedMs(retrievalStartedAt, this.now());
      const attemptBase = buildAttemptDraft({
        retrievalQuery,
        activeConfigurationId,
        sufficiencyStatus: sufficiency.sufficient ? "SUFFICIENT" : "INSUFFICIENT",
        sufficiencyReason: sufficiency.reason,
        confidence: sufficiency.confidence,
        evidence,
        retrievalDurationMs,
      });

      if (!sufficiency.sufficient) {
        return {
          kind: "INSUFFICIENT_CONTEXT",
          content: insufficientContextMessage(sufficiency.reason),
          insufficientContext: true,
          attempt: {
            ...attemptBase,
            selectedEvidenceMetadata: buildSelectedEvidenceMetadata(
              sufficiency.selectedChunks.map((chunk, index) => ({
                sourceLabel: `SOURCE_${index + 1}`,
                chunk,
                retrievalRank: candidates.findIndex((candidate) => candidate.id === chunk.id) + 1,
              }))
            ),
          },
          citations: [],
        };
      }

      if (!supportsStructuredGeneration(provider)) {
        return {
          kind: "FAILED",
          failureCode: AiGenerationFailureCode.INVALID_PROVIDER_RESPONSE,
          attempt: attemptBase,
        };
      }

      const prompt = buildGroundedTeachPrompt({
        userMessage: context.userMessage,
        subjectName: context.subjectName,
        topicTitle: context.topicTitle,
        recentMessages: context.recentMessages,
        evidence,
      });
      const generationStartedAt = this.now();
      const structured = await this.generateValidatedStructuredResponse(
        provider,
        prompt.messages,
        evidence
      ).catch((error) => {
        const failureCode =
          error instanceof GroundedOutputValidationError
            ? AiGenerationFailureCode.INVALID_PROVIDER_RESPONSE
            : getSafeProviderFailureCode(error);
        return {
          failureCode,
          failed: true as const,
        };
      });
      const generationDurationMs = elapsedMs(generationStartedAt, this.now());

      if ("failed" in structured) {
        return {
          kind: "FAILED",
          failureCode: structured.failureCode,
          attempt: {
            ...attemptBase,
            promptVersion: prompt.promptVersion,
            generationDurationMs,
          },
        };
      }

      if (structured.response.insufficientContext) {
        return {
          kind: "INSUFFICIENT_CONTEXT",
          content: insufficientContextMessage("LOW_RELEVANCE"),
          insufficientContext: true,
          attempt: {
            ...attemptBase,
            sufficiencyStatus: "INSUFFICIENT",
            sufficiencyReason: "LOW_RELEVANCE",
            confidence: "LOW",
            generationDurationMs,
          },
          citations: [],
        };
      }

      return {
        kind: "COMPLETED",
        content: structured.response.answer,
        provider: structured.result.provider,
        model: structured.result.model,
        usage: structured.result.usage,
        insufficientContext: false,
        attempt: {
          ...attemptBase,
          promptVersion: prompt.promptVersion,
          generationDurationMs,
        },
        citations: structured.response.citations.map((citation) => ({
          sourceLabel: citation.sourceLabel,
          evidence: evidence.find(
            (item) => item.sourceLabel === citation.sourceLabel
          )!,
        })),
      };
    } catch (error) {
      const failureCode =
        error instanceof GroundedOutputValidationError
          ? AiGenerationFailureCode.INVALID_PROVIDER_RESPONSE
          : getSafeProviderFailureCode(error);
      const retrievalDurationMs = elapsedMs(retrievalStartedAt, this.now());

      return {
        kind: "FAILED",
        failureCode,
        attempt: buildAttemptDraft({
          retrievalQuery,
          activeConfigurationId,
          sufficiencyStatus: "INSUFFICIENT",
          sufficiencyReason:
            failureCode === AiGenerationFailureCode.INVALID_PROVIDER_RESPONSE
              ? "LOW_RELEVANCE"
              : "NO_RESULTS",
          confidence: "LOW",
          evidence: [],
          retrievalDurationMs,
        }),
      };
    }
  }

  private async generateValidatedStructuredResponse(
    provider: StructuredChatModelProvider,
    messages: GenerateMessage[],
    evidence: LabeledEvidence[]
  ) {
    const first = await providerGenerateStructured(provider, messages);
    let validationError = "Invalid grounded model output.";
    try {
      return {
        result: first,
        response: validateGroundedTeachOutput(first.value, evidence),
      };
    } catch (error) {
      if (!(error instanceof GroundedOutputValidationError)) throw error;
      validationError = error.message;
    }

    const repaired = await providerGenerateStructured(provider, [
      ...messages,
      {
        role: "user",
        content:
          [
            "Repair the previous response by regenerating the full JSON object.",
            `Validation error: ${validationError}`,
            "If citations contains SOURCE_1, answer must literally contain [SOURCE_1] in square brackets.",
            "Do not put source labels only in the citations array.",
            "Cite only supplied SOURCE labels, and keep answer markers and citation objects exactly aligned.",
            "Return only valid JSON matching the schema.",
          ].join(" "),
      },
    ]);
    return {
      result: repaired,
      response: validateGroundedTeachOutput(repaired.value, evidence),
    };
  }

  private now() {
    return this.options.now?.() ?? performance.now();
  }
}

async function providerGenerateStructured(
  provider: StructuredChatModelProvider,
  messages: GenerateMessage[]
) {
  try {
    return await provider.generateStructured({
      messages,
      temperature: 0.2,
      maxOutputTokens: GROUNDED_MAX_OUTPUT_TOKENS,
      outputSchema: groundedTeachOutputSchema,
    });
  } catch (error) {
    if (error instanceof ChatProviderError) throw error;
    throw new ChatProviderError(AiGenerationFailureCode.PROVIDER_ERROR);
  }
}

function buildAttemptDraft(input: {
  retrievalQuery: string;
  activeConfigurationId: string | null;
  sufficiencyStatus: "SUFFICIENT" | "INSUFFICIENT";
  sufficiencyReason: SufficiencyReason;
  confidence: GroundingConfidence;
  evidence: LabeledEvidence[];
  retrievalDurationMs?: number;
  generationDurationMs?: number;
}): GroundingAttemptDraft {
  return {
    retrievalQuery: input.retrievalQuery,
    embeddingConfigurationId: input.activeConfigurationId,
    sufficiencyStatus: input.sufficiencyStatus,
    sufficiencyReason: input.sufficiencyReason,
    confidence: input.confidence,
    selectedEvidenceMetadata: buildSelectedEvidenceMetadata(input.evidence),
    groundingVersion: GROUNDING_VERSION,
    promptVersion: GROUNDED_PROMPT_VERSION,
    sufficiencyPolicyVersion: SUFFICIENCY_POLICY_VERSION,
    retrievalDurationMs: input.retrievalDurationMs,
    generationDurationMs: input.generationDurationMs,
  };
}

function insufficientContextMessage(reason: SufficiencyReason) {
  void reason;
  return "I don’t have enough approved StudyBuddy material to answer that reliably yet. Try asking a more specific question or choosing the closest subject and topic.";
}

function elapsedMs(start: number, end: number) {
  return Math.max(0, Math.round(end - start));
}
