import { AccountDeletionRequestStatus, AccountStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendInactiveAccountExpiryWarningEmail } from "@/lib/account-deletion-email";
import {
  logSecurityEvent,
  securityFingerprint,
} from "@/lib/security/audit-log";

export const ACTIVE_DELETION_DAYS = 30;
export const BACKUP_EXPIRY_DAYS = 90;
export const DELETION_CANCELLATION_DAYS = 15;
export const INACTIVE_ACCOUNT_RETENTION_MONTHS = 36;
export const INACTIVE_ACCOUNT_WARNING_DAYS = [90, 60, 15, 1] as const;
const DELETION_DELAY_MS = DELETION_CANCELLATION_DAYS * 24 * 60 * 60 * 1_000;
const DAY_MS = 24 * 60 * 60 * 1_000;
const PROCESSING_LEASE_MS = 15 * 60 * 1_000;

export class AccountLifecycleConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountLifecycleConflictError";
  }
}

export async function deactivateAccount(userId: string) {
  const deactivatedAt = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: userId, accountStatus: AccountStatus.ACTIVE },
      data: {
        accountStatus: AccountStatus.DEACTIVATED,
        deactivatedAt,
        inactiveDeletionAt: inactiveAccountDeletionDate(deactivatedAt),
        inactiveWarning90SentAt: null,
        inactiveWarning60SentAt: null,
        inactiveWarning15SentAt: null,
        inactiveWarning1SentAt: null,
      },
    });
    if (updated.count === 1) {
      await tx.accountDeletionRequest.updateMany({
        where: {
          userId,
          status: AccountDeletionRequestStatus.AWAITING_CONFIRMATION,
        },
        data: {
          status: AccountDeletionRequestStatus.CANCELLED,
          cancelledAt: new Date(),
          confirmationTokenHash: null,
          confirmationTokenExpiresAt: null,
        },
      });
    }
    return updated;
  });
  if (result.count !== 1) {
    throw new AccountLifecycleConflictError(
      "Only an active account can be deactivated."
    );
  }
}

export async function preparePermanentDeletionConfirmation(input: {
  userId: string;
  tokenHash: string;
  tokenExpiresAt: Date;
}) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({
      where: { id: input.userId },
      select: { accountStatus: true },
    });
    if (!current) {
      throw new AccountLifecycleConflictError("Account not found.");
    }

    if (current.accountStatus !== AccountStatus.ACTIVE) {
      throw new AccountLifecycleConflictError(
        "Only an active account can request permanent deletion."
      );
    }

    return tx.accountDeletionRequest.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        authUserId: input.userId,
        accountFingerprint: securityFingerprint(input.userId),
        status: AccountDeletionRequestStatus.AWAITING_CONFIRMATION,
        requestedAt: now,
        confirmationTokenHash: input.tokenHash,
        confirmationTokenExpiresAt: input.tokenExpiresAt,
      },
      update: {
        authUserId: input.userId,
        accountFingerprint: securityFingerprint(input.userId),
        status: AccountDeletionRequestStatus.AWAITING_CONFIRMATION,
        requestedAt: now,
        confirmationSentAt: null,
        confirmationTokenHash: input.tokenHash,
        confirmationTokenExpiresAt: input.tokenExpiresAt,
        confirmedAt: null,
        retentionTriggeredAt: null,
        scheduledFor: null,
        processingStartedAt: null,
        completedAt: null,
        cancelledAt: null,
        attemptCount: 0,
        lastFailureCode: null,
      },
      select: { id: true },
    });
  });
}

export async function markDeletionConfirmationSent(
  requestId: string,
  tokenHash: string
) {
  const result = await prisma.accountDeletionRequest.updateMany({
    where: {
      id: requestId,
      status: AccountDeletionRequestStatus.AWAITING_CONFIRMATION,
      confirmationTokenHash: tokenHash,
    },
    data: { confirmationSentAt: new Date() },
  });
  if (result.count !== 1) {
    throw new AccountLifecycleConflictError(
      "The deletion confirmation request is no longer active."
    );
  }
}

export async function abandonDeletionConfirmation(
  requestId: string,
  tokenHash: string
) {
  await prisma.accountDeletionRequest.updateMany({
    where: {
      id: requestId,
      status: AccountDeletionRequestStatus.AWAITING_CONFIRMATION,
      confirmationTokenHash: tokenHash,
    },
    data: {
      status: AccountDeletionRequestStatus.CANCELLED,
      cancelledAt: new Date(),
      confirmationTokenHash: null,
      confirmationTokenExpiresAt: null,
      lastFailureCode: "CONFIRMATION_EMAIL_FAILED",
    },
  });
}

export async function confirmPermanentDeletion(tokenHash: string) {
  const now = new Date();
  const scheduledFor = new Date(now.getTime() + DELETION_DELAY_MS);

  return prisma.$transaction(async (tx) => {
    const request = await tx.accountDeletionRequest.findUnique({
      where: { confirmationTokenHash: tokenHash },
      select: {
        id: true,
        userId: true,
        authUserId: true,
        status: true,
        confirmationTokenExpiresAt: true,
      },
    });
    if (
      !request?.userId ||
      !request.authUserId ||
      request.status !== AccountDeletionRequestStatus.AWAITING_CONFIRMATION ||
      !request.confirmationTokenExpiresAt ||
      request.confirmationTokenExpiresAt <= now
    ) {
      throw new AccountLifecycleConflictError(
        "This confirmation link is invalid or has expired."
      );
    }

    const locked = await tx.user.updateMany({
      where: { id: request.userId, accountStatus: AccountStatus.ACTIVE },
      data: {
        accountStatus: AccountStatus.DELETION_PENDING,
        deactivatedAt: now,
        inactiveDeletionAt: null,
        inactiveWarning90SentAt: null,
        inactiveWarning60SentAt: null,
        inactiveWarning15SentAt: null,
        inactiveWarning1SentAt: null,
      },
    });
    if (locked.count !== 1) {
      throw new AccountLifecycleConflictError(
        "This account can no longer be scheduled from this link."
      );
    }

    const confirmed = await tx.accountDeletionRequest.updateMany({
      where: {
        id: request.id,
        status: AccountDeletionRequestStatus.AWAITING_CONFIRMATION,
        confirmationTokenHash: tokenHash,
        confirmationTokenExpiresAt: { gt: now },
      },
      data: {
        status: AccountDeletionRequestStatus.PENDING,
        confirmedAt: now,
        scheduledFor,
        confirmationTokenHash: null,
        confirmationTokenExpiresAt: null,
        processingStartedAt: null,
        completedAt: null,
        cancelledAt: null,
        attemptCount: 0,
        lastFailureCode: null,
      },
    });
    if (confirmed.count !== 1) {
      throw new AccountLifecycleConflictError(
        "This confirmation link has already been used."
      );
    }

    return {
      requestId: request.id,
      userId: request.userId,
      authUserId: request.authUserId,
      scheduledFor,
    };
  });
}

export async function reactivateAccount(userId: string) {
  const result = await prisma.user.updateMany({
    where: { id: userId, accountStatus: AccountStatus.DEACTIVATED },
    data: {
      accountStatus: AccountStatus.ACTIVE,
      deactivatedAt: null,
      inactiveDeletionAt: null,
      inactiveWarning90SentAt: null,
      inactiveWarning60SentAt: null,
      inactiveWarning15SentAt: null,
      inactiveWarning1SentAt: null,
    },
  });
  if (result.count !== 1) {
    throw new AccountLifecycleConflictError(
      "Only a deactivated account can be reactivated."
    );
  }
}

export async function cancelPermanentDeletion(userId: string) {
  await prisma.$transaction(async (tx) => {
    const updated = await tx.accountDeletionRequest.updateMany({
      where: {
        userId,
        status: {
          in: [
            AccountDeletionRequestStatus.PENDING,
            AccountDeletionRequestStatus.FAILED,
          ],
        },
        retentionTriggeredAt: null,
      },
      data: {
        status: AccountDeletionRequestStatus.CANCELLED,
        cancelledAt: new Date(),
        processingStartedAt: null,
        lastFailureCode: null,
      },
    });
    if (updated.count !== 1) {
      throw new AccountLifecycleConflictError(
        "This deletion request can no longer be cancelled."
      );
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        accountStatus: AccountStatus.ACTIVE,
        deactivatedAt: null,
        inactiveDeletionAt: null,
        inactiveWarning90SentAt: null,
        inactiveWarning60SentAt: null,
        inactiveWarning15SentAt: null,
        inactiveWarning1SentAt: null,
      },
    });
  });
}

export async function getAccountLifecycle(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountStatus: true,
      deactivatedAt: true,
      inactiveDeletionAt: true,
      deletionRequest: {
        select: {
          scheduledFor: true,
          status: true,
          retentionTriggeredAt: true,
        },
      },
    },
  });
  if (!user) throw new AccountLifecycleConflictError("Account not found.");
  return user;
}

export function inactiveAccountDeletionDate(deactivatedAt: Date) {
  return shiftUtcMonths(deactivatedAt, INACTIVE_ACCOUNT_RETENTION_MONTHS);
}

export async function processInactiveAccountRetention(batchSize = 25) {
  const now = new Date();
  const largestWarningCutoff = new Date(
    now.getTime() + INACTIVE_ACCOUNT_WARNING_DAYS[0] * DAY_MS
  );
  const sixtyDayCutoff = new Date(now.getTime() + 60 * DAY_MS);
  const fifteenDayCutoff = new Date(now.getTime() + 15 * DAY_MS);
  const oneDayCutoff = new Date(now.getTime() + DAY_MS);
  const take = Math.min(Math.max(1, batchSize), 100);
  const candidates = await prisma.user.findMany({
    where: {
      accountStatus: AccountStatus.DEACTIVATED,
      inactiveDeletionAt: { lte: largestWarningCutoff },
      OR: [
        { inactiveDeletionAt: { lte: now } },
        {
          inactiveDeletionAt: {
            gt: sixtyDayCutoff,
            lte: largestWarningCutoff,
          },
          inactiveWarning90SentAt: null,
        },
        {
          inactiveDeletionAt: {
            gt: fifteenDayCutoff,
            lte: sixtyDayCutoff,
          },
          inactiveWarning60SentAt: null,
        },
        {
          inactiveDeletionAt: {
            gt: oneDayCutoff,
            lte: fifteenDayCutoff,
          },
          inactiveWarning15SentAt: null,
        },
        {
          inactiveDeletionAt: { gt: now, lte: oneDayCutoff },
          inactiveWarning1SentAt: null,
        },
      ],
    },
    orderBy: { inactiveDeletionAt: "asc" },
    take,
    select: {
      id: true,
      deactivatedAt: true,
      inactiveDeletionAt: true,
      inactiveWarning90SentAt: true,
      inactiveWarning60SentAt: true,
      inactiveWarning15SentAt: true,
      inactiveWarning1SentAt: true,
    },
  });

  let warningsSent = 0;
  let warningsFailed = 0;
  let expirationsScheduled = 0;

  for (const candidate of candidates) {
    if (!candidate.deactivatedAt || !candidate.inactiveDeletionAt) continue;

    if (candidate.inactiveDeletionAt <= now) {
      const scheduled = await scheduleInactiveAccountDeletion(
        candidate.id,
        candidate.inactiveDeletionAt,
        now
      );
      if (scheduled) expirationsScheduled += 1;
      continue;
    }

    const daysRemaining = dueInactiveWarning(
      candidate.inactiveDeletionAt,
      now,
      candidate
    );
    if (!daysRemaining) continue;

    try {
      const authResult = await getSupabaseAdminClient().auth.admin.getUserById(
        candidate.id
      );
      const email = authResult.data.user?.email;
      if (authResult.error || !email) {
        throw new Error("ACCOUNT_EMAIL_UNAVAILABLE");
      }

      await sendInactiveAccountExpiryWarningEmail({
        email,
        daysRemaining,
        deletionAt: candidate.inactiveDeletionAt,
        idempotencyKey: securityFingerprint(
          `${candidate.id}:${candidate.deactivatedAt.toISOString()}:${daysRemaining}`
        ),
      });

      const marked = await prisma.user.updateMany({
        where: {
          id: candidate.id,
          accountStatus: AccountStatus.DEACTIVATED,
          deactivatedAt: candidate.deactivatedAt,
          ...unsentWarningCondition(daysRemaining),
        },
        data: sentWarningTimestamp(daysRemaining, now),
      });
      if (marked.count === 1) warningsSent += 1;
    } catch {
      warningsFailed += 1;
      logSecurityEvent("inactive_account_warning_failed", "error", {
        accountFingerprint: securityFingerprint(candidate.id),
        daysRemaining,
      });
    }
  }

  return {
    examined: candidates.length,
    warningsSent,
    warningsFailed,
    expirationsScheduled,
  };
}

type InactiveAccountCandidate = {
  id: string;
  deactivatedAt: Date | null;
  inactiveDeletionAt: Date | null;
  inactiveWarning90SentAt: Date | null;
  inactiveWarning60SentAt: Date | null;
  inactiveWarning15SentAt: Date | null;
  inactiveWarning1SentAt: Date | null;
};

function dueInactiveWarning(
  deletionAt: Date,
  now: Date,
  candidate: InactiveAccountCandidate
): 90 | 60 | 15 | 1 | null {
  const remainingMs = deletionAt.getTime() - now.getTime();
  if (remainingMs <= DAY_MS && !candidate.inactiveWarning1SentAt) return 1;
  if (remainingMs <= 15 * DAY_MS && !candidate.inactiveWarning15SentAt) {
    return 15;
  }
  if (remainingMs <= 60 * DAY_MS && !candidate.inactiveWarning60SentAt) {
    return 60;
  }
  if (remainingMs <= 90 * DAY_MS && !candidate.inactiveWarning90SentAt) {
    return 90;
  }
  return null;
}

function unsentWarningCondition(daysRemaining: 90 | 60 | 15 | 1) {
  if (daysRemaining === 1) return { inactiveWarning1SentAt: null };
  if (daysRemaining === 15) return { inactiveWarning15SentAt: null };
  if (daysRemaining === 60) return { inactiveWarning60SentAt: null };
  return { inactiveWarning90SentAt: null };
}

function sentWarningTimestamp(
  daysRemaining: 90 | 60 | 15 | 1,
  sentAt: Date
) {
  if (daysRemaining === 1) return { inactiveWarning1SentAt: sentAt };
  if (daysRemaining === 15) return { inactiveWarning15SentAt: sentAt };
  if (daysRemaining === 60) return { inactiveWarning60SentAt: sentAt };
  return { inactiveWarning90SentAt: sentAt };
}

async function scheduleInactiveAccountDeletion(
  userId: string,
  inactiveDeletionAt: Date,
  now: Date
) {
  const scheduled = await prisma.$transaction(async (tx) => {
    const locked = await tx.user.updateMany({
      where: {
        id: userId,
        accountStatus: AccountStatus.DEACTIVATED,
        inactiveDeletionAt,
      },
      data: { accountStatus: AccountStatus.DELETION_PENDING },
    });
    if (locked.count !== 1) return false;

    await tx.accountDeletionRequest.upsert({
      where: { userId },
      create: {
        userId,
        authUserId: userId,
        accountFingerprint: securityFingerprint(userId),
        status: AccountDeletionRequestStatus.PENDING,
        requestedAt: now,
        retentionTriggeredAt: now,
        scheduledFor: now,
      },
      update: {
        authUserId: userId,
        accountFingerprint: securityFingerprint(userId),
        status: AccountDeletionRequestStatus.PENDING,
        requestedAt: now,
        confirmationSentAt: null,
        confirmationTokenHash: null,
        confirmationTokenExpiresAt: null,
        confirmedAt: null,
        retentionTriggeredAt: now,
        scheduledFor: now,
        processingStartedAt: null,
        completedAt: null,
        cancelledAt: null,
        attemptCount: 0,
        lastFailureCode: null,
      },
    });
    return true;
  });

  if (scheduled) {
    logSecurityEvent("inactive_account_deletion_scheduled", "info", {
      accountFingerprint: securityFingerprint(userId),
    });
  }
  return scheduled;
}

function shiftUtcMonths(value: Date, months: number) {
  const originalDay = value.getUTCDate();
  const shifted = new Date(value);
  shifted.setUTCDate(1);
  shifted.setUTCMonth(shifted.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 0)
  ).getUTCDate();
  shifted.setUTCDate(Math.min(originalDay, lastDay));
  return shifted;
}

export async function processDueAccountDeletions(batchSize = 25) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - PROCESSING_LEASE_MS);
  const candidates = await prisma.accountDeletionRequest.findMany({
    where: {
      scheduledFor: { lte: now },
      OR: [
        {
          status: {
            in: [
              AccountDeletionRequestStatus.PENDING,
              AccountDeletionRequestStatus.FAILED,
            ],
          },
        },
        {
          status: AccountDeletionRequestStatus.PROCESSING,
          processingStartedAt: { lt: staleBefore },
        },
      ],
    },
    orderBy: { scheduledFor: "asc" },
    take: Math.min(Math.max(1, batchSize), 100),
    select: { id: true },
  });

  let completed = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const claimed = await prisma.accountDeletionRequest.updateMany({
      where: {
        id: candidate.id,
        OR: [
          {
            status: {
              in: [
                AccountDeletionRequestStatus.PENDING,
                AccountDeletionRequestStatus.FAILED,
              ],
            },
          },
          {
            status: AccountDeletionRequestStatus.PROCESSING,
            processingStartedAt: { lt: staleBefore },
          },
        ],
      },
      data: {
        status: AccountDeletionRequestStatus.PROCESSING,
        processingStartedAt: now,
        attemptCount: { increment: 1 },
        lastFailureCode: null,
      },
    });
    if (claimed.count !== 1) continue;

    const outcome = await purgeClaimedAccount(candidate.id);
    if (outcome === "completed") completed += 1;
    else failed += 1;
  }

  return { examined: candidates.length, completed, failed };
}

async function purgeClaimedAccount(requestId: string) {
  try {
    const request = await prisma.accountDeletionRequest.findUnique({
      where: { id: requestId },
      select: {
        userId: true,
        authUserId: true,
        accountFingerprint: true,
        status: true,
      },
    });
    if (!request || request.status !== AccountDeletionRequestStatus.PROCESSING) {
      return "failed" as const;
    }

    if (request.userId) {
      await prisma.user.deleteMany({ where: { id: request.userId } });
    }

    if (request.authUserId) {
      const result = await getSupabaseAdminClient().auth.admin.deleteUser(
        request.authUserId
      );
      if (result.error && !supabaseUserIsAlreadyAbsent(result.error)) {
        throw new Error("AUTH_DELETE_FAILED");
      }
    }

    await prisma.accountDeletionRequest.update({
      where: { id: requestId },
      data: {
        userId: null,
        authUserId: null,
        status: AccountDeletionRequestStatus.COMPLETED,
        completedAt: new Date(),
        processingStartedAt: null,
        lastFailureCode: null,
      },
    });
    logSecurityEvent("account_deletion_completed", "info", {
      accountFingerprint: request.accountFingerprint,
    });
    return "completed" as const;
  } catch (error) {
    const failureCode =
      error instanceof Error && error.message === "AUTH_DELETE_FAILED"
        ? "AUTH_DELETE_FAILED"
        : "ACCOUNT_PURGE_FAILED";
    await prisma.accountDeletionRequest.updateMany({
      where: { id: requestId },
      data: {
        status: AccountDeletionRequestStatus.FAILED,
        processingStartedAt: null,
        lastFailureCode: failureCode,
      },
    });
    logSecurityEvent("account_deletion_failed", "error", {
      requestFingerprint: securityFingerprint(requestId),
      failureCode,
    });
    return "failed" as const;
  }
}

function supabaseUserIsAlreadyAbsent(error: { status?: number; code?: string }) {
  return error.status === 404 || error.code === "user_not_found";
}
