export type ResourceServiceErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "RESOURCE_NOT_FOUND"
  | "INVALID_INPUT"
  | "INVALID_SUBJECT_TOPIC"
  | "RESOURCE_NOT_PROCESSABLE"
  | "RESOURCE_NOT_APPROVABLE"
  | "STORAGE_ERROR"
  | "EXTRACTION_FAILED"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ResourceServiceErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  RESOURCE_NOT_FOUND: 404,
  INVALID_INPUT: 400,
  INVALID_SUBJECT_TOPIC: 400,
  RESOURCE_NOT_PROCESSABLE: 409,
  RESOURCE_NOT_APPROVABLE: 409,
  STORAGE_ERROR: 502,
  EXTRACTION_FAILED: 422,
  INTERNAL_ERROR: 500,
};

export class ResourceServiceError extends Error {
  readonly code: ResourceServiceErrorCode;
  readonly status: number;

  constructor(code: ResourceServiceErrorCode, message: string) {
    super(message);
    this.name = "ResourceServiceError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}

export function resourceErrorResponse(error: unknown) {
  if (error instanceof ResourceServiceError) {
    return {
      status: error.status,
      body: { error: error.code, message: error.message },
    };
  }

  return {
    status: 500,
    body: {
      error: "INTERNAL_ERROR",
      message: "The resource request could not be completed.",
    },
  };
}
