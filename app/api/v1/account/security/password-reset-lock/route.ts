import { NextResponse } from "next/server";
import {
  confirmPasswordResetSecurityLock,
  isPasswordResetSecurityToken,
  PasswordResetSecurityError,
} from "@/lib/password-reset-security";
import { parseJsonObjectRequest, REQUEST_LIMITS } from "@/lib/security/request-body";
import { enforceRateLimitRules, getClientIp } from "@/lib/security/rate-limit";
import { validatePublicMutationOrigin } from "@/lib/security/csrf";

export async function POST(request: Request) {
  const origin = validatePublicMutationOrigin(request);
  if (!origin.ok) {
    return NextResponse.json(
      { error: "CSRF_VALIDATION_FAILED", message: "The request origin could not be verified." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const parsed = await parseJsonObjectRequest(request, REQUEST_LIMITS.publicFormJson);
  if (!parsed.ok) return parsed.response;
  const token = parsed.data.token;
  if (!isPasswordResetSecurityToken(token)) return invalidTokenResponse();

  const rateLimit = await enforceRateLimitRules([
    {
      scope: "auth:password-reset-lock:ip",
      identifier: getClientIp(request.headers),
      limit: 20,
      windowMs: 60 * 60_000,
    },
    {
      scope: "auth:password-reset-lock:token",
      identifier: token,
      limit: 5,
      windowMs: 60 * 60_000,
    },
  ]);
  if (rateLimit) return rateLimit;

  try {
    const result = await confirmPasswordResetSecurityLock(token);
    return NextResponse.json(
      {
        ok: true,
        lockedUntil: result.lockedUntil.toISOString(),
        recoveryEmailSent: result.recoveryEmailSent,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (
      error instanceof PasswordResetSecurityError &&
      error.code === "INVALID_OR_EXPIRED_TOKEN"
    ) {
      return invalidTokenResponse();
    }
    return NextResponse.json(
      {
        error: "ACCOUNT_LOCK_INCOMPLETE",
        message:
          "Account access has been restricted, but the security lock is still being applied. Retry or contact security@studybuddyng.com.",
      },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } }
    );
  }
}

function invalidTokenResponse() {
  return NextResponse.json(
    {
      error: "INVALID_OR_EXPIRED_TOKEN",
      message: "This security link is invalid, expired, or already used.",
    },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );
}
