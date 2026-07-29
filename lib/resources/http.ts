import { NextResponse } from "next/server";
import { resourceErrorResponse } from "./errors";

export function resourceRouteErrorResponse(error: unknown) {
  const safe = resourceErrorResponse(error);
  return NextResponse.json(safe.body, { status: safe.status });
}

export function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
