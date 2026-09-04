import { NextResponse } from "next/server";

export const REQUEST_LIMITS = {
  json: 64 * 1024,
  aiJson: 16 * 1024,
  publicFormJson: 16 * 1024,
  adminBatchJson: 2 * 1024 * 1024,
  webhook: 1024 * 1024,
  imageUpload: 6 * 1024 * 1024,
  resourceUpload: 26 * 1024 * 1024,
} as const;

export type ParsedRequest<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseJsonRequest(
  request: Request,
  maxBytes = REQUEST_LIMITS.json
): Promise<ParsedRequest<unknown>> {
  const parsed = await readRequestBytes(request, maxBytes);
  if (!parsed.ok) return parsed;

  try {
    return {
      ok: true,
      data: JSON.parse(new TextDecoder().decode(parsed.data)),
    };
  } catch {
    return invalidBody("Invalid JSON body.");
  }
}

export async function parseJsonObjectRequest(
  request: Request,
  maxBytes = REQUEST_LIMITS.json
): Promise<ParsedRequest<Record<string, unknown>>> {
  const parsed = await parseJsonRequest(request, maxBytes);
  if (!parsed.ok) return parsed;

  if (
    parsed.data === null ||
    typeof parsed.data !== "object" ||
    Array.isArray(parsed.data)
  ) {
    return invalidBody("Expected a JSON object.");
  }

  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export async function parseTextRequest(
  request: Request,
  maxBytes: number
): Promise<ParsedRequest<string>> {
  const parsed = await readRequestBytes(request, maxBytes);
  if (!parsed.ok) return parsed;
  return { ok: true, data: new TextDecoder().decode(parsed.data) };
}

export async function parseFormDataRequest(
  request: Request,
  maxBytes: number
): Promise<ParsedRequest<FormData>> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/form-data")) {
    return invalidBody("Expected multipart form data.");
  }

  const parsed = await readRequestBytes(request, maxBytes);
  if (!parsed.ok) return parsed;

  try {
    const copy = new Request("http://localhost/", {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: parsed.data,
    });
    return { ok: true, data: await copy.formData() };
  } catch {
    return invalidBody("Invalid multipart form data.");
  }
}

async function readRequestBytes(
  request: Request,
  maxBytes: number
): Promise<ParsedRequest<Uint8Array>> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const size = Number.parseInt(declaredLength, 10);
    if (Number.isFinite(size) && size > maxBytes) return bodyTooLarge(maxBytes);
  }

  if (!request.body) return { ok: true, data: new Uint8Array() };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return bodyTooLarge(maxBytes);
      }
      chunks.push(value);
    }
  } catch {
    return invalidBody("The request body could not be read.");
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, data: bytes };
}

function bodyTooLarge(maxBytes: number): ParsedRequest<never> {
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: "REQUEST_TOO_LARGE",
        message: `Request body must be ${formatBytes(maxBytes)} or smaller.`,
      },
      { status: 413, headers: { "Cache-Control": "no-store" } }
    ),
  };
}

function invalidBody(message: string): ParsedRequest<never> {
  return {
    ok: false,
    response: NextResponse.json(
      { error: "INVALID_REQUEST_BODY", message },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    ),
  };
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${bytes / (1024 * 1024)} MB`;
  return `${bytes / 1024} KB`;
}
