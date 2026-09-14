import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  PasswordResetSecurityEventType,
  Prisma,
  type PasswordResetSecurityState,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  logSecurityEvent,
  securityFingerprint,
  securityIdentifierHash,
} from "@/lib/security/audit-log";
import { fetchWithTimeout } from "@/lib/security/timeouts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { authRedirectUrl } from "@/lib/supabase/auth-redirect";
import { SECURITY_EMAIL } from "@/lib/legal-entity";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const DEFAULT_ALERT_COOLDOWN_HOURS = 24;
const DEFAULT_ALERT_DAILY_CAP = 1;
const DEFAULT_LOCK_REVIEW_TTL_MINUTES = 30;
const DEFAULT_LOCK_DURATION_HOURS = 24;

export type PasswordResetSecurityErrorCode =
  | "INVALID_OR_EXPIRED_TOKEN"
  | "AUTH_LOCK_FAILED"
  | "RECOVERY_FAILED"
  | "RECOVERY_NOT_VERIFIED";

export class PasswordResetSecurityError extends Error {
  constructor(public readonly code: PasswordResetSecurityErrorCode) {
    super(code);
    this.name = "PasswordResetSecurityError";
  }
}

export function isPasswordResetSecurityToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function createPasswordResetSecurityToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPasswordResetSecurityToken(token) };
}

export function hashPasswordResetSecurityToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function passwordResetLockReviewExpiry(now = new Date()) {
  const minutes = boundedIntegerFromEnv(
    "PASSWORD_RESET_LOCK_REVIEW_TTL_MINUTES",
    DEFAULT_LOCK_REVIEW_TTL_MINUTES,
    10,
    120
  );
  return new Date(now.getTime() + minutes * 60_000);
}

export function passwordResetSecurityLockExpiry(now = new Date()) {
  const hours = boundedIntegerFromEnv(
    "PASSWORD_RESET_SECURITY_LOCK_HOURS",
    DEFAULT_LOCK_DURATION_HOURS,
    1,
    72
  );
  return new Date(now.getTime() + hours * 60 * 60_000);
}

export function passwordResetSecurityRestrictionIsActive(
  state: Pick<
    PasswordResetSecurityState,
    "lockedAt" | "recoveryCompletedAt"
  > | null | undefined
) {
  if (!state?.lockedAt) return false;
  return (
    !state.recoveryCompletedAt || state.recoveryCompletedAt < state.lockedAt
  );
}

/**
 * Runs after the public rate-limit response has been produced. Any failure is
 * deliberately contained so provider/database timing cannot alter that public
 * response or reveal whether the submitted email exists.
 */
export async function processPasswordResetLimitAlert(input: {
  email: string;
  requestedAt?: Date;
}) {
  const requestedAt = input.requestedAt ?? new Date();
  const normalizedEmail = input.email.trim().toLowerCase();
  let accountFingerprint: string;

  try {
    accountFingerprint = securityIdentifierHash(normalizedEmail);
  } catch {
    logSecurityEvent("password_reset_abuse_alert_failed", "error", {
      reason: "HASH_CONFIGURATION",
    });
    return { outcome: "failed" as const };
  }

  try {
    const appUser = await prisma.user.findUnique({
      where: { authEmailFingerprint: accountFingerprint },
      select: { id: true },
    });
    if (!appUser) return { outcome: "not_applicable" as const };

    const authResult = await getSupabaseAdminClient().auth.admin.getUserById(
      appUser.id
    );
    const authUser = authResult.data.user;
    if (
      authResult.error ||
      !authUser?.email ||
      !authUser.email_confirmed_at ||
      authUser.email.trim().toLowerCase() !== normalizedEmail
    ) {
      return { outcome: "not_applicable" as const };
    }

    const lockToken = createPasswordResetSecurityToken();
    const expiresAt = passwordResetLockReviewExpiry(requestedAt);
    const reservation = await reserveAlert({
      userId: appUser.id,
      requestedAt,
      tokenHash: lockToken.tokenHash,
      tokenExpiresAt: expiresAt,
    });
    if (!reservation) return { outcome: "suppressed" as const };

    try {
      await sendPasswordResetAbuseAlertEmail({
        email: normalizedEmail,
        token: lockToken.token,
        requestedAt,
        expiresAt,
      });
      await prisma.$transaction([
        prisma.passwordResetSecurityState.update({
          where: { userId: appUser.id },
          data: { lastAlertSentAt: requestedAt },
        }),
        prisma.passwordResetSecurityEvent.create({
          data: {
            userId: appUser.id,
            eventType: PasswordResetSecurityEventType.ALERT_SENT,
          },
        }),
      ]);
      logSecurityEvent("password_reset_abuse_alert_sent", "info", {
        accountFingerprint: securityFingerprint(appUser.id),
      });
      return { outcome: "sent" as const };
    } catch {
      await recordEventBestEffort(
        appUser.id,
        PasswordResetSecurityEventType.ALERT_DELIVERY_FAILED
      );
      logSecurityEvent("password_reset_abuse_alert_failed", "error", {
        accountFingerprint: securityFingerprint(appUser.id),
        reason: "DELIVERY",
      });
      return { outcome: "failed" as const };
    }
  } catch {
    logSecurityEvent("password_reset_abuse_alert_failed", "error", {
      accountFingerprint: securityFingerprint(normalizedEmail),
      reason: "INTERNAL",
    });
    return { outcome: "failed" as const };
  }
}

export async function confirmPasswordResetSecurityLock(
  token: string,
  now = new Date()
) {
  const tokenHash = hashPasswordResetSecurityToken(token);
  const recoveryToken = createPasswordResetSecurityToken();
  let state = await prisma.passwordResetSecurityState.findUnique({
    where: { lockTokenHash: tokenHash },
  });

  const retryingAuthLock = Boolean(
    state?.lockTokenUsedAt &&
      state.lockTokenExpiresAt &&
      state.lockTokenExpiresAt > now &&
      state.lockedAt &&
      !state.authLockAppliedAt
  );

  if (!state || !state.lockTokenExpiresAt || state.lockTokenExpiresAt <= now) {
    throw new PasswordResetSecurityError("INVALID_OR_EXPIRED_TOKEN");
  }
  const userId = state.userId;

  if (!retryingAuthLock) {
    if (state.lockTokenUsedAt) {
      throw new PasswordResetSecurityError("INVALID_OR_EXPIRED_TOKEN");
    }

    const lockedUntil = passwordResetSecurityLockExpiry(now);
    const claimed = await prisma.$transaction(async (transaction) => {
      const result = await transaction.passwordResetSecurityState.updateMany({
        where: {
          userId,
          lockTokenHash: tokenHash,
          lockTokenUsedAt: null,
          lockTokenExpiresAt: { gt: now },
        },
        data: {
          lockTokenUsedAt: now,
          lockedAt: now,
          lockedUntil,
          lockExpiryRecordedAt: null,
          authLockAppliedAt: null,
          recoveryTokenHash: recoveryToken.tokenHash,
          recoveryTokenExpiresAt: lockedUntil,
          recoveryTokenUsedAt: null,
          recoveryStartedAt: null,
          recoveryCompletedAt: null,
        },
      });
      if (result.count === 1) {
        await transaction.passwordResetSecurityEvent.create({
          data: {
            userId,
            eventType: PasswordResetSecurityEventType.LOCK_CONFIRMED,
          },
        });
      }
      return result;
    });
    if (claimed.count !== 1) {
      throw new PasswordResetSecurityError("INVALID_OR_EXPIRED_TOKEN");
    }
    state = await prisma.passwordResetSecurityState.findUniqueOrThrow({
      where: { userId: state.userId },
    });
  } else {
    // The application restriction was committed but the provider request did
    // not finish. A retry with the same review token receives a fresh recovery
    // token; no previously emailed recovery token can become valid later.
    await prisma.passwordResetSecurityState.update({
      where: { userId: state.userId },
      data: {
        recoveryTokenHash: recoveryToken.tokenHash,
        recoveryTokenExpiresAt: state.lockedUntil,
        recoveryTokenUsedAt: null,
      },
    });
  }

  if (!state.lockedUntil) {
    throw new PasswordResetSecurityError("AUTH_LOCK_FAILED");
  }

  try {
    const secondsRemaining = Math.max(
      1,
      Math.ceil((state.lockedUntil.getTime() - now.getTime()) / 1000)
    );
    const randomReplacementPassword = `${randomBytes(48).toString("base64url")}Aa1!`;
    const update = await getSupabaseAdminClient().auth.admin.updateUserById(
      state.userId,
      {
        password: randomReplacementPassword,
        ban_duration: `${secondsRemaining}s`,
      }
    );
    const email = update.data.user?.email;
    if (update.error || !email) throw update.error;

    await prisma.$transaction([
      prisma.passwordResetSecurityState.update({
        where: { userId: state.userId },
        data: { authLockAppliedAt: new Date() },
      }),
      prisma.passwordResetSecurityEvent.create({
        data: {
          userId: state.userId,
          eventType: PasswordResetSecurityEventType.AUTH_LOCK_APPLIED,
        },
      }),
    ]);

    let recoveryEmailSent = false;
    try {
      await sendPasswordResetLockConfirmationEmail({
        email,
        token: recoveryToken.token,
        lockedUntil: state.lockedUntil,
      });
      recoveryEmailSent = true;
    } catch {
      logSecurityEvent("password_reset_lock_email_failed", "error", {
        accountFingerprint: securityFingerprint(state.userId),
      });
    }

    logSecurityEvent("password_reset_security_lock_applied", "warn", {
      accountFingerprint: securityFingerprint(state.userId),
      lockHours: boundedIntegerFromEnv(
        "PASSWORD_RESET_SECURITY_LOCK_HOURS",
        DEFAULT_LOCK_DURATION_HOURS,
        1,
        72
      ),
    });
    return { lockedUntil: state.lockedUntil, recoveryEmailSent };
  } catch {
    await recordEventBestEffort(
      state.userId,
      PasswordResetSecurityEventType.AUTH_LOCK_FAILED
    );
    logSecurityEvent("password_reset_security_lock_failed", "error", {
      accountFingerprint: securityFingerprint(state.userId),
    });
    throw new PasswordResetSecurityError("AUTH_LOCK_FAILED");
  }
}

export async function beginPasswordResetSecurityRecovery(
  token: string,
  now = new Date()
) {
  const tokenHash = hashPasswordResetSecurityToken(token);
  const state = await prisma.passwordResetSecurityState.findUnique({
    where: { recoveryTokenHash: tokenHash },
  });
  if (
    !state?.lockedAt ||
    !state.authLockAppliedAt ||
    !state.recoveryTokenExpiresAt ||
    state.recoveryTokenExpiresAt <= now ||
    state.recoveryTokenUsedAt ||
    !passwordResetSecurityRestrictionIsActive(state)
  ) {
    throw new PasswordResetSecurityError("INVALID_OR_EXPIRED_TOKEN");
  }

  const claimed = await prisma.$transaction(async (transaction) => {
    const result = await transaction.passwordResetSecurityState.updateMany({
      where: {
        userId: state.userId,
        recoveryTokenHash: tokenHash,
        recoveryTokenUsedAt: null,
        recoveryTokenExpiresAt: { gt: now },
      },
      data: { recoveryTokenUsedAt: now },
    });
    if (result.count === 1) {
      await transaction.passwordResetSecurityEvent.create({
        data: {
          userId: state.userId,
          eventType: PasswordResetSecurityEventType.RECOVERY_REQUESTED,
        },
      });
    }
    return result;
  });
  if (claimed.count !== 1) {
    throw new PasswordResetSecurityError("INVALID_OR_EXPIRED_TOKEN");
  }

  try {
    const admin = getSupabaseAdminClient();
    const authResult = await admin.auth.admin.getUserById(state.userId);
    const email = authResult.data.user?.email;
    if (authResult.error || !email) throw authResult.error;

    const unban = await admin.auth.admin.updateUserById(state.userId, {
      ban_duration: "none",
    });
    if (unban.error) throw unban.error;

    const config = getServerSupabaseConfig();
    const authClient = createClient(config.url, config.key, {
      global: { fetch: fetchWithTimeout },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const reset = await authClient.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUrl("/auth/password-reset"),
    });
    if (reset.error) throw reset.error;

    await prisma.$transaction([
      prisma.passwordResetSecurityState.update({
        where: { userId: state.userId },
        data: { recoveryStartedAt: now },
      }),
      prisma.passwordResetSecurityEvent.create({
        data: {
          userId: state.userId,
          eventType: PasswordResetSecurityEventType.RECOVERY_EMAIL_SENT,
        },
      }),
    ]);
    logSecurityEvent("password_reset_security_recovery_started", "info", {
      accountFingerprint: securityFingerprint(state.userId),
    });
    return { ok: true as const };
  } catch {
    const secondsRemaining = Math.max(
      1,
      Math.ceil(((state.lockedUntil ?? now).getTime() - now.getTime()) / 1000)
    );
    try {
      await getSupabaseAdminClient().auth.admin.updateUserById(state.userId, {
        ban_duration: `${secondsRemaining}s`,
      });
    } catch {
      // The randomized password and application restriction still fail closed.
    }
    await prisma.passwordResetSecurityState.updateMany({
      where: { userId: state.userId, recoveryTokenUsedAt: now },
      data: { recoveryTokenUsedAt: null },
    });
    await recordEventBestEffort(
      state.userId,
      PasswordResetSecurityEventType.RECOVERY_FAILED
    );
    logSecurityEvent("password_reset_security_recovery_failed", "error", {
      accountFingerprint: securityFingerprint(state.userId),
    });
    throw new PasswordResetSecurityError("RECOVERY_FAILED");
  }
}

export async function completePasswordResetSecurityRecovery(
  userId: string,
  now = new Date()
) {
  const state = await prisma.passwordResetSecurityState.findUnique({
    where: { userId },
  });
  if (!passwordResetSecurityRestrictionIsActive(state)) {
    return { completed: false as const };
  }

  const authResult = await getSupabaseAdminClient().auth.admin.getUserById(userId);
  const lastSignInAt = authResult.data.user?.last_sign_in_at
    ? new Date(authResult.data.user.last_sign_in_at)
    : null;
  if (
    authResult.error ||
    !state?.lockedAt ||
    !lastSignInAt ||
    lastSignInAt <= state.lockedAt
  ) {
    throw new PasswordResetSecurityError("RECOVERY_NOT_VERIFIED");
  }

  const unban = await getSupabaseAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (unban.error) {
    throw new PasswordResetSecurityError("RECOVERY_FAILED");
  }

  await prisma.$transaction([
    prisma.passwordResetSecurityState.update({
      where: { userId },
      data: {
        recoveryCompletedAt: now,
        lockTokenHash: null,
        lockTokenExpiresAt: null,
        recoveryTokenHash: null,
        recoveryTokenExpiresAt: null,
      },
    }),
    prisma.passwordResetSecurityEvent.create({
      data: {
        userId,
        eventType: PasswordResetSecurityEventType.UNLOCKED,
      },
    }),
  ]);
  logSecurityEvent("password_reset_security_recovery_completed", "info", {
    accountFingerprint: securityFingerprint(userId),
  });
  return { completed: true as const };
}

/** Records the natural expiry of Supabase's temporary provider ban. */
export async function recordExpiredPasswordResetSecurityLocks(
  batchSize = 50,
  now = new Date()
) {
  const safeBatchSize = Math.max(1, Math.min(100, Math.floor(batchSize)));
  const due = await prisma.passwordResetSecurityState.findMany({
    where: {
      lockedUntil: { lte: now },
      authLockAppliedAt: { not: null },
      lockExpiryRecordedAt: null,
    },
    select: { userId: true },
    orderBy: { lockedUntil: "asc" },
    take: safeBatchSize,
  });
  let recorded = 0;

  for (const state of due) {
    const changed = await prisma.$transaction(async (transaction) => {
      const result = await transaction.passwordResetSecurityState.updateMany({
        where: {
          userId: state.userId,
          lockedUntil: { lte: now },
          lockExpiryRecordedAt: null,
        },
        data: { lockExpiryRecordedAt: now },
      });
      if (result.count === 1) {
        await transaction.passwordResetSecurityEvent.create({
          data: {
            userId: state.userId,
            eventType: PasswordResetSecurityEventType.LOCK_EXPIRED,
          },
        });
      }
      return result;
    });
    if (changed.count !== 1) continue;
    recorded += 1;
  }

  return { examined: due.length, recorded };
}

async function reserveAlert(input: {
  userId: string;
  requestedAt: Date;
  tokenHash: string;
  tokenExpiresAt: Date;
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const state = await transaction.passwordResetSecurityState.findUnique({
            where: { userId: input.userId },
          });
          const cooldownHours = boundedIntegerFromEnv(
            "PASSWORD_RESET_ABUSE_ALERT_COOLDOWN_HOURS",
            DEFAULT_ALERT_COOLDOWN_HOURS,
            1,
            168
          );
          const dailyCap = boundedIntegerFromEnv(
            "PASSWORD_RESET_ABUSE_ALERT_DAILY_CAP",
            DEFAULT_ALERT_DAILY_CAP,
            1,
            5
          );
          const alertDay = utcDay(input.requestedAt);
          const sameDay = state?.alertDay?.getTime() === alertDay.getTime();
          const alertCount = sameDay ? state?.alertCount ?? 0 : 0;
          const withinCooldown = Boolean(
            state?.lastAlertAttemptAt &&
              input.requestedAt.getTime() - state.lastAlertAttemptAt.getTime() <
                cooldownHours * 60 * 60_000
          );
          const alreadyLocked = passwordResetSecurityRestrictionIsActive(state);

          if (withinCooldown || alertCount >= dailyCap || alreadyLocked) {
            await transaction.passwordResetSecurityEvent.create({
              data: {
                userId: input.userId,
                eventType: PasswordResetSecurityEventType.ALERT_SUPPRESSED,
                details: {
                  reason: alreadyLocked
                    ? "ACCOUNT_ALREADY_LOCKED"
                    : withinCooldown
                      ? "COOLDOWN"
                      : "DAILY_CAP",
                },
              },
            });
            return false;
          }

          await transaction.passwordResetSecurityState.upsert({
            where: { userId: input.userId },
            create: {
              userId: input.userId,
              lastAlertAttemptAt: input.requestedAt,
              alertDay,
              alertCount: 1,
              lockTokenHash: input.tokenHash,
              lockTokenExpiresAt: input.tokenExpiresAt,
            },
            update: {
              lastAlertAttemptAt: input.requestedAt,
              alertDay,
              alertCount: alertCount + 1,
              lockTokenHash: input.tokenHash,
              lockTokenExpiresAt: input.tokenExpiresAt,
              lockTokenUsedAt: null,
            },
          });
          await transaction.passwordResetSecurityEvent.create({
            data: {
              userId: input.userId,
              eventType: PasswordResetSecurityEventType.ALERT_REQUESTED,
            },
          });
          return true;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (
        attempt < 2 &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      ) {
        continue;
      }
      throw error;
    }
  }
  return false;
}

async function sendPasswordResetAbuseAlertEmail(input: {
  email: string;
  token: string;
  requestedAt: Date;
  expiresAt: Date;
}) {
  const config = securityEmailConfiguration();
  const reviewUrl = `${config.appOrigin}/account-security/password-reset-alert#token=${encodeURIComponent(input.token)}`;
  const response = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `password-reset-abuse-${hashPasswordResetSecurityToken(input.token)}`,
    },
    body: JSON.stringify({
      from: config.from,
      to: [input.email],
      reply_to: SECURITY_EMAIL,
      subject: "Several password-reset requests for your Study Buddy account",
      html: `
        <p>Hello,</p>
        <p>Someone made several password-reset requests for your Study Buddy account. If this was you, no action is needed.</p>
        <p>If it was not you, you can review the activity and choose whether to temporarily lock your account:</p>
        <p><a href="${reviewUrl}">Review and protect my account</a></p>
        <p>The request limit was reached at ${escapeHtml(input.requestedAt.toUTCString())}. This one-time review link expires at ${escapeHtml(input.expiresAt.toUTCString())}.</p>
        <p>Opening the link does not lock your account. You must confirm the action on the page.</p>
        <p>Study Buddy Security<br />${SECURITY_EMAIL}</p>
      `,
      text: [
        "Hello,",
        "Someone made several password-reset requests for your Study Buddy account. If this was you, no action is needed.",
        "If it was not you, review the activity and choose whether to temporarily lock your account:",
        reviewUrl,
        `The request limit was reached at ${input.requestedAt.toUTCString()}.`,
        `This one-time review link expires at ${input.expiresAt.toUTCString()}.`,
        "Opening the link does not lock your account. You must confirm the action on the page.",
        `Questions: ${SECURITY_EMAIL}`,
      ].join("\n\n"),
    }),
  });
  if (!response.ok) throw new Error("PASSWORD_RESET_ABUSE_EMAIL_FAILED");
}

async function sendPasswordResetLockConfirmationEmail(input: {
  email: string;
  token: string;
  lockedUntil: Date;
}) {
  const config = securityEmailConfiguration();
  const recoveryUrl = `${config.appOrigin}/account-security/password-reset-recovery#token=${encodeURIComponent(input.token)}`;
  const deadline = input.lockedUntil.toUTCString();
  const response = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `password-reset-lock-${hashPasswordResetSecurityToken(input.token)}`,
    },
    body: JSON.stringify({
      from: config.from,
      to: [input.email],
      reply_to: SECURITY_EMAIL,
      subject: "Your Study Buddy account has been temporarily locked",
      html: `
        <p>Hello,</p>
        <p>You confirmed a temporary security lock on your Study Buddy account. Active sessions were revoked and the previous password can no longer be used.</p>
        <p>The provider lock lasts until ${escapeHtml(deadline)}. You can securely start password recovery sooner:</p>
        <p><a href="${recoveryUrl}">Unlock and send password-reset instructions</a></p>
        <p>The recovery link is single-use and expires at the same time. Opening it alone does not change the account.</p>
        <p>If you need help, contact <a href="mailto:${SECURITY_EMAIL}">${SECURITY_EMAIL}</a>.</p>
        <p>Study Buddy Security</p>
      `,
      text: [
        "Hello,",
        "You confirmed a temporary security lock on your Study Buddy account. Active sessions were revoked and the previous password can no longer be used.",
        `The provider lock lasts until ${deadline}.`,
        "You can securely start password recovery sooner:",
        recoveryUrl,
        "The recovery link is single-use and expires at the same time. Opening it alone does not change the account.",
        `Help: ${SECURITY_EMAIL}`,
      ].join("\n\n"),
    }),
  });
  if (!response.ok) throw new Error("PASSWORD_RESET_LOCK_EMAIL_FAILED");
}

function securityEmailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TRANSACTIONAL_EMAIL_FROM?.trim();
  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  if (!apiKey || !from) {
    throw new Error("Password security email delivery is not configured.");
  }
  if (!configuredOrigin) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APP_ORIGIN is required for password security emails.");
    }
    return { apiKey, from, appOrigin: "http://localhost:3000" };
  }

  const url = new URL(configuredOrigin);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("APP_ORIGIN must use HTTPS in production.");
  }
  return { apiKey, from, appOrigin: url.origin };
}

async function recordEventBestEffort(
  userId: string,
  eventType: PasswordResetSecurityEventType
) {
  try {
    await prisma.passwordResetSecurityEvent.create({
      data: { userId, eventType },
    });
  } catch {
    logSecurityEvent("password_reset_security_audit_failed", "error", {
      accountFingerprint: securityFingerprint(userId),
      eventType,
    });
  }
}

function utcDay(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  );
}

function boundedIntegerFromEnv(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : fallback;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character
  );
}
