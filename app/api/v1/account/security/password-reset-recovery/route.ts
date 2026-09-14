import { NextResponse } from "next/server";
import {
  beginPasswordResetSecurityRecovery,
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
      scope: "auth:password-reset-recovery:ip",
      identifier: getClientIp(request.headers),
      limit: 20,
      windowMs: 60 * 60_000,
    },
    {
      scope: "auth:password-reset-recovery:token",
      identifier: token,
      limit: 5,
      windowMs: 60 * 60_000,
    },
  ]);
  if (rateLimit) return rateLimit;

  try {
    await beginPasswordResetSecurityRecovery(token);
    return NextResponse.json(
      {
        ok: true,
        message: "Password-reset instructions have been sent to the account email.",
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
        error: "RECOVERY_FAILED",
        message: "Recovery could not be started. Retry or contact security@studybuddyng.com.",
      },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } }
    );
  }
}

function invalidTokenResponse() {
  return NextResponse.json(
    {
      error: "INVALID_OR_EXPIRED_TOKEN",
      message: "This recovery link is invalid, expired, or already used.",
    },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );
}
