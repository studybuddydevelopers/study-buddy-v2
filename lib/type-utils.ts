export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function getErrorMessage(
  error: unknown,
  fallback = "unknown error"
): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (isRecord(error)) {
    const message = error.message;
    if (typeof message === "string") return message;
  }

  return fallback;
}
