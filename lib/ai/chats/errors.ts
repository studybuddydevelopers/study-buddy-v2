export type ChatServiceErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "CHAT_NOT_FOUND"
  | "INVALID_INPUT"
  | "INVALID_SUBJECT_TOPIC"
  | "REQUEST_PENDING"
  | "CHAT_LOCKED"
  | "PROVIDER_TIMEOUT"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "INVALID_PROVIDER_RESPONSE"
  | "INTERNAL_ERROR"
  | "REQUEST_CONFLICT";

export class ChatServiceError extends Error {
  readonly code: ChatServiceErrorCode;
  readonly status: number;

  constructor(
    code: ChatServiceErrorCode,
    status: number,
    message: string = code
  ) {
    super(message);
    this.name = "ChatServiceError";
    this.code = code;
    this.status = status;
  }
}

export function isChatServiceError(error: unknown): error is ChatServiceError {
  return error instanceof ChatServiceError;
}

export function chatServiceErrorResponse(error: unknown) {
  if (isChatServiceError(error)) {
    return {
      body: { error: error.code, message: error.message },
      status: error.status,
    };
  }

  return {
    body: { error: "INTERNAL_ERROR", message: "Unexpected chat service error" },
    status: 500,
  };
}
