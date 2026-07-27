import { AiGenerationFailureCode } from "@prisma/client";

export class ChatProviderError extends Error {
  readonly failureCode: AiGenerationFailureCode;

  constructor(failureCode: AiGenerationFailureCode, message: string = failureCode) {
    super(message);
    this.name = "ChatProviderError";
    this.failureCode = failureCode;
  }
}

export function getSafeProviderFailureCode(error: unknown) {
  if (error instanceof ChatProviderError) {
    return error.failureCode;
  }

  return AiGenerationFailureCode.INTERNAL_ERROR;
}
