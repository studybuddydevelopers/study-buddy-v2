type ErrorResponseBody = {
  error?: unknown;
  message?: unknown;
};

function nonEmptyMessage(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function readResponseError(
  response: Response,
  fallback: string
): Promise<string> {
  const body = (await response.json().catch(() => null)) as ErrorResponseBody | null;

  return (
    nonEmptyMessage(body?.message) ??
    nonEmptyMessage(body?.error) ??
    fallback
  );
}
