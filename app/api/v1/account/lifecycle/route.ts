import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  AccountLifecycleConflictError,
  ACTIVE_DELETION_DAYS,
  BACKUP_EXPIRY_DAYS,
  DELETION_CANCELLATION_DAYS,
  INACTIVE_ACCOUNT_RETENTION_MONTHS,
  INACTIVE_ACCOUNT_WARNING_DAYS,
  abandonDeletionConfirmation,
  cancelPermanentDeletion,
  deactivateAccount,
  getAccountLifecycle,
  markDeletionConfirmationSent,
  preparePermanentDeletionConfirmation,
  reactivateAccount,
} from "@/lib/account-lifecycle";
import {
  accountDeletionConfirmationExpiry,
  createAccountDeletionConfirmationToken,
  sendAccountDeletionConfirmationEmail,
} from "@/lib/account-deletion-email";
import { requireAuthenticatedUser } from "@/lib/auth";
import { syncAuthAccountStatus } from "@/lib/guardian-authorization";
import { isRecord } from "@/lib/type-utils";
import { parseJsonRequest, REQUEST_LIMITS } from "@/lib/security/request-body";
import {
  enforceRateLimitRules,
  getClientIp,
} from "@/lib/security/rate-limit";
import { logSecurityEvent, securityFingerprint } from "@/lib/security/audit-log";
import { fetchWithTimeout } from "@/lib/security/timeouts";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { signedOutJsonResponse } from "@/lib/supabase/sign-out-response";

const ACTIONS = new Set([
  "DEACTIVATE",
  "REQUEST_DELETION",
  "REACTIVATE",
  "CANCEL_DELETION",
]);

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const lifecycle = await getAccountLifecycle(auth.dbUser.id);
  return NextResponse.json(
    {
      accountStatus: lifecycle.accountStatus,
      deactivatedAt: lifecycle.deactivatedAt?.toISOString() ?? null,
      inactiveDeletionScheduledFor:
        lifecycle.inactiveDeletionAt?.toISOString() ?? null,
      deletionScheduledFor:
        lifecycle.deletionRequest?.scheduledFor?.toISOString() ?? null,
      deletionRequestStatus: lifecycle.deletionRequest?.status ?? null,
      activeDeletionDays: ACTIVE_DELETION_DAYS,
      deletionCancellationDays: DELETION_CANCELLATION_DAYS,
      inactiveAccountRetentionMonths: INACTIVE_ACCOUNT_RETENTION_MONTHS,
      inactiveAccountWarningDays: INACTIVE_ACCOUNT_WARNING_DAYS,
      deletionCancellationAllowed:
        Boolean(lifecycle.deletionRequest) &&
        !lifecycle.deletionRequest?.retentionTriggeredAt,
      backupExpiryDays: BACKUP_EXPIRY_DAYS,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const parsed = await parseJsonRequest(request, REQUEST_LIMITS.publicFormJson);
  if (!parsed.ok) return parsed.response;
  if (!isRecord(parsed.data) || typeof parsed.data.action !== "string") {
    return invalidRequest("Choose a valid account action.");
  }

  const action = parsed.data.action;
  if (!ACTIONS.has(action)) return invalidRequest("Choose a valid account action.");

  const limit = await enforceRateLimitRules([
    {
      scope: "account:lifecycle:ip",
      identifier: getClientIp(request.headers),
      limit: 10,
      windowMs: 15 * 60_000,
    },
    {
      scope: "account:lifecycle:account",
      identifier: auth.dbUser.id,
      limit: 8,
      windowMs: 15 * 60_000,
    },
  ]);
  if (limit) return limit;

  try {
    if (action === "DEACTIVATE") {
      await deactivateAccount(auth.dbUser.id);
      await syncAuthAccountStatus(auth.dbUser.id, "DEACTIVATED");
      logSecurityEvent("account_deactivated", "info", {
        accountFingerprint: securityFingerprint(auth.dbUser.id),
      });
      return signedOutJsonResponse(request, {
        ok: true,
        accountStatus: "DEACTIVATED",
      });
    }

    if (action === "REQUEST_DELETION") {
      const password = parsed.data.password;
      const typedConfirmation = parsed.data.confirmation;
      if (
        typeof password !== "string" ||
        password.length < 1 ||
        password.length > 1_024 ||
        typedConfirmation !== "DELETE"
      ) {
        return invalidRequest(
          "Enter your current password and type DELETE exactly."
        );
      }

      const reauthLimit = await enforceRateLimitRules([
        {
          scope: "account:deletion:reauth",
          identifier: auth.dbUser.id,
          limit: 5,
          windowMs: 15 * 60_000,
        },
      ]);
      if (reauthLimit) return reauthLimit;

      const passwordValid = await verifyCurrentPassword(auth.user, password);
      if (!passwordValid) {
        logSecurityEvent("account_deletion_reauthentication_failed", "warn", {
          accountFingerprint: securityFingerprint(auth.dbUser.id),
        });
        return NextResponse.json(
          { error: "The current password is incorrect." },
          { status: 401, headers: { "Cache-Control": "no-store" } }
        );
      }

      if (!auth.user.email) {
        return NextResponse.json(
          {
            error: "A verified account email is required to confirm deletion.",
          },
          { status: 409, headers: { "Cache-Control": "no-store" } }
        );
      }

      const confirmation = createAccountDeletionConfirmationToken();
      const expiresAt = accountDeletionConfirmationExpiry();
      const deletion = await preparePermanentDeletionConfirmation({
        userId: auth.dbUser.id,
        tokenHash: confirmation.tokenHash,
        tokenExpiresAt: expiresAt,
      });
      try {
        await sendAccountDeletionConfirmationEmail({
          email: auth.user.email,
          token: confirmation.token,
          expiresAt,
        });
        await markDeletionConfirmationSent(
          deletion.id,
          confirmation.tokenHash
        );
      } catch {
        await abandonDeletionConfirmation(
          deletion.id,
          confirmation.tokenHash
        );
        logSecurityEvent("account_deletion_confirmation_email_failed", "error", {
          accountFingerprint: securityFingerprint(auth.dbUser.id),
        });
        return NextResponse.json(
          { error: "The confirmation email could not be sent. Try again." },
          { status: 503, headers: { "Cache-Control": "no-store" } }
        );
      }

      logSecurityEvent("account_deletion_confirmation_sent", "info", {
        accountFingerprint: securityFingerprint(auth.dbUser.id),
      });
      return NextResponse.json({
        ok: true,
        confirmationRequired: true,
        confirmationExpiresAt: expiresAt.toISOString(),
      }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (action === "REACTIVATE") {
      await reactivateAccount(auth.dbUser.id);
      await syncAuthAccountStatus(auth.dbUser.id, "ACTIVE");
      logSecurityEvent("account_reactivated", "info", {
        accountFingerprint: securityFingerprint(auth.dbUser.id),
      });
      return signedOutJsonResponse(request, {
        ok: true,
        accountStatus: "ACTIVE",
      });
    }

    await cancelPermanentDeletion(auth.dbUser.id);
    await syncAuthAccountStatus(auth.dbUser.id, "ACTIVE");
    logSecurityEvent("account_deletion_cancelled", "info", {
      accountFingerprint: securityFingerprint(auth.dbUser.id),
    });
    return signedOutJsonResponse(request, {
      ok: true,
      accountStatus: "ACTIVE",
    });
  } catch (error) {
    if (error instanceof AccountLifecycleConflictError) {
      return NextResponse.json(
        { error: "ACCOUNT_STATE_CONFLICT", message: error.message },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }
    logSecurityEvent("account_lifecycle_action_failed", "error", {
      accountFingerprint: securityFingerprint(auth.dbUser.id),
      action,
    });
    return NextResponse.json(
      { error: "The account action could not be completed. Try again." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

async function verifyCurrentPassword(
  user: { id: string; email?: string; phone?: string },
  password: string
) {
  const config = getServerSupabaseConfig();
  const client = createClient(config.url, config.key, {
    global: { fetch: fetchWithTimeout },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const result = user.email
      ? await client.auth.signInWithPassword({ email: user.email, password })
      : user.phone
        ? await client.auth.signInWithPassword({ phone: user.phone, password })
        : null;
    return Boolean(result && !result.error && result.data.user?.id === user.id);
  } catch {
    return false;
  }
}

function invalidRequest(message: string) {
  return NextResponse.json(
    { error: "INVALID_REQUEST", message },
    { status: 400, headers: { "Cache-Control": "no-store" } }
  );
}
