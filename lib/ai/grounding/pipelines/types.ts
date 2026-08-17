import type { GenerateUsage, ChatModelProvider } from "@/lib/ai/chat/types";
import type { ResourceSearchRepository } from "@/lib/resources/retrieval/types";
import type { EmbeddingProvider } from "@/lib/ai/embeddings/types";
import type { AiGenerationFailureCode } from "@prisma/client";
import type { AnswerabilityDecision } from "../answerability/types";
import type { EvidenceCapability } from "../capabilities/types";
import type { RequestRequirements } from "../requirements/types";
import type { ValidatedEvidenceUnit } from "../evidence-units/validated-evidence-unit";
import type { NarrowGroundingValidationResult } from "../validation/narrow-grounding-validator";
import type { GroundedTeachAnswerSegment } from "../structured-output";

export type GroundingPipelineContext = {
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
  retrievalResourceIds?: string[];
};

export type CapabilityPipelineDiagnostics = {
  pipelineVersion: string;
  promptVersion: string;
  retrievalQuery: string;
  requestRequirements: RequestRequirements;
  evidenceCapabilities: EvidenceCapability[];
  answerabilityDecision: AnswerabilityDecision;
  validatedEvidenceUnits: ValidatedEvidenceUnit[];
  generationOutput?: unknown;
  narrowValidatorResult?: NarrowGroundingValidationResult;
};

export type CapabilityGroundingCitation = {
  sourceLabel: string;
  resourceChunkId: string;
  evidenceUnitIds: string[];
};

export type CapabilityGroundingOutcome =
  | {
      kind: "COMPLETED";
      content: string;
      provider: string;
      model: string;
      usage?: GenerateUsage;
      insufficientContext: false;
      answerSegments: Array<GroundedTeachAnswerSegment & { evidenceUnitIds?: string[] }>;
      diagnostics: CapabilityPipelineDiagnostics;
      citations: CapabilityGroundingCitation[];
    }
  | {
      kind: "INSUFFICIENT_CONTEXT";
      content: string;
      insufficientContext: true;
      diagnostics: CapabilityPipelineDiagnostics;
      citations: [];
    }
  | {
      kind: "FAILED";
      failureCode: AiGenerationFailureCode;
      diagnostics?: Partial<CapabilityPipelineDiagnostics>;
    };

export type CapabilityPipelineOptions = {
  searchRepository?: ResourceSearchRepository;
  embeddingProvider?: EmbeddingProvider;
  now?: () => number;
};

export interface GroundingPipeline {
  generate(input: {
    context: GroundingPipelineContext;
    provider: ChatModelProvider;
  }): Promise<unknown>;
}
