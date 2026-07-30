export type RetrievalErrorCode =
  | "INVALID_INPUT"
  | "INVALID_SUBJECT_TOPIC"
  | "NO_ACTIVE_EMBEDDING_CONFIGURATION"
  | "DIMENSION_MISMATCH"
  | "INTERNAL_ERROR";

export class RetrievalError extends Error {
  readonly code: RetrievalErrorCode;

  constructor(code: RetrievalErrorCode, message: string) {
    super(message);
    this.name = "RetrievalError";
    this.code = code;
  }
}
