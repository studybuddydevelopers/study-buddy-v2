import { NextResponse } from "next/server";
import { resourceErrorResponse } from "./errors";

const REDACTED_RESOURCE_FIELDS = new Set(["storageBucket", "storagePath"]);

export function resourceJsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(redactResourceStorage(body), init);
}

export function resourceRouteErrorResponse(error: unknown) {
  const safe = resourceErrorResponse(error);
  return NextResponse.json(safe.body, { status: safe.status });
}

export function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function redactResourceStorage(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactResourceStorage);

  if (!value || typeof value !== "object") return value;

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (REDACTED_RESOURCE_FIELDS.has(key)) continue;
    output[key] = redactResourceStorage(nested);
  }
  return output;
}
