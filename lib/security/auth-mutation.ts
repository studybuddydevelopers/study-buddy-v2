import { NextResponse } from "next/server";
import { logSecurityEvent } from "./audit-log";
import { validatePublicMutationOrigin } from "./csrf";

/**
 * Login and signup can establish a session before a browser has any cookies.
 * Validate their Origin and JSON media type before reading credentials or
 * invoking rate limits/authentication. Cookie-only CSRF checks are not enough.
 */
export function validateAuthMutationRequest(request: Request): NextResponse | null {
  const origin = validatePublicMutationOrigin(request);
  if (!origin.ok) {
    logSecurityEvent("csrf_validation_failed", "warn", {
      reason: origin.reason,
      method: request.method,
      path: new URL(request.url).pathname,
    });
    return NextResponse.json(
      {
        error: "CSRF_VALIDATION_FAILED",
        message: "The request origin could not be verified.",
      },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Browser HTML forms can submit JSON-looking text/plain bodies without a
  // preflight. Do not treat those (or other form encodings) as JSON requests.
  const mediaType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    return NextResponse.json(
      {
        error: "UNSUPPORTED_MEDIA_TYPE",
        message: "Content-Type must be application/json.",
      },
      { status: 415, headers: { "Cache-Control": "no-store" } }
    );
  }

  return null;
}
