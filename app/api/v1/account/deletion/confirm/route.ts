import { NextResponse } from "next/server";
import {
  AccountLifecycleConflictError,
  confirmPermanentDeletion,
} from "@/lib/account-lifecycle";
import {
  hashAccountDeletionConfirmationToken,
  sendAccountDeletionPendingEmail,
} from "@/lib/account-deletion-email";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncAuthAccountStatus } from "@/lib/guardian-authorization";
import { signedOutJsonResponse } from "@/lib/supabase/sign-out-response";
import { parseJsonObjectRequest, REQUEST_LIMITS } from "@/lib/security/request-body";
import {
  enforceRateLimitRules,
  getClientIp,
} from "@/lib/security/rate-limit";
import { logSecurityEvent, securityFingerprint } from "@/lib/security/audit-log";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function POST(request: Request) {
  const parsed = await parseJsonObjectRequest(
    request,
    REQUEST_LIMITS.publicFormJson
  );
  if (!parsed.ok) return parsed.response;

  const token = parsed.data.token;
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) {
    return invalidTokenResponse();
  }

  const limit = await enforceRateLimitRules([
    {
      scope: "account:deletion:confirm:ip",
      identifier: getClientIp(request.headers),
      limit: 20,
      windowMs: 60 * 60_000,
    },
    {
      scope: "account:deletion:confirm:token",
      identifier: token,
      limit: 5,
      windowMs: 60 * 60_000,
    },
  ]);
  if (limit) return limit;

  try {
    const confirmed = await confirmPermanentDeletion(
      hashAccountDeletionConfirmationToken(token)
    );
    await syncAuthAccountStatus(confirmed.userId, "DELETION_PENDING");

    let notificationEmailSent = false;
    try {
      const authResult = await getSupabaseAdminClient().auth.admin.getUserById(
        confirmed.authUserId
      );
      const email = authResult.data.user?.email;
      if (authResult.error || !email) {
        throw new Error("ACCOUNT_EMAIL_UNAVAILABLE");
      }
      await sendAccountDeletionPendingEmail({
        email,
        requestId: confirmed.requestId,
        scheduledFor: confirmed.scheduledFor,
      });
      notificationEmailSent = true;
    } catch {
      logSecurityEvent("account_deletion_pending_email_failed", "error", {
        accountFingerprint: securityFingerprint(confirmed.userId),
      });
    }

    logSecurityEvent("account_deletion_confirmed", "info", {
      accountFingerprint: securityFingerprint(confirmed.userId),
      scheduledFor: confirmed.scheduledFor.toISOString(),
    });
    return signedOutJsonResponse(request, {
      ok: true,
      accountStatus: "DELETION_PENDING",
      deletionScheduledFor: confirmed.scheduledFor.toISOString(),
      notificationEmailSent,
    });
  } catch (error) {
    if (error instanceof AccountLifecycleConflictError) {
      return invalidTokenResponse();
    }
    logSecurityEvent("account_deletion_confirmation_failed", "error");
    return NextResponse.json(
      { error: "The deletion request could not be confirmed. Try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

function invalidTokenResponse() {
  return NextResponse.json(
    {
      error: "INVALID_OR_EXPIRED_CONFIRMATION",
      message: "This confirmation link is invalid, expired, or already used.",
    },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );
}

