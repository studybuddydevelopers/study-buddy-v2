import { AccountDeletionRequestStatus, AccountStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  logSecurityEvent,
  securityFingerprint,
} from "@/lib/security/audit-log";

export const ACTIVE_DELETION_DAYS = 30;
export const BACKUP_EXPIRY_DAYS = 90;
const DELETION_DELAY_MS = ACTIVE_DELETION_DAYS * 24 * 60 * 60 * 1_000;
const CRON_SAFETY_MARGIN_MS = 2 * 60 * 60 * 1_000;
const PROCESSING_LEASE_MS = 15 * 60 * 1_000;

export class AccountLifecycleConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountLifecycleConflictError";
  }
}

export async function deactivateAccount(userId: string) {
  const result = await prisma.user.updateMany({
    where: { id: userId, accountStatus: AccountStatus.ACTIVE },
    data: {
      accountStatus: AccountStatus.DEACTIVATED,
      deactivatedAt: new Date(),
    },
  });
  if (result.count !== 1) {
    throw new AccountLifecycleConflictError(
      "Only an active account can be deactivated."
    );
  }
}

export async function requestPermanentDeletion(userId: string) {
  const now = new Date();
  // Leave room for an hourly scheduler run before the public 30-day maximum.
  const scheduledFor = new Date(
    now.getTime() + DELETION_DELAY_MS - CRON_SAFETY_MARGIN_MS
  );

  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({
      where: { id: userId },
      select: { accountStatus: true },
    });
    if (!current) {
      throw new AccountLifecycleConflictError("Account not found.");
    }

    if (current.accountStatus === AccountStatus.DELETION_PENDING) {
      const existing = await tx.accountDeletionRequest.findUnique({
        where: { userId },
        select: { scheduledFor: true },
      });
      if (existing) return existing;
    }
    if (current.accountStatus !== AccountStatus.ACTIVE) {
      throw new AccountLifecycleConflictError(
        "Only an active account can request permanent deletion."
      );
    }

    const locked = await tx.user.updateMany({
      where: { id: userId, accountStatus: AccountStatus.ACTIVE },
      data: {
        accountStatus: AccountStatus.DELETION_PENDING,
        deactivatedAt: now,
      },
    });
    if (locked.count !== 1) {
      throw new AccountLifecycleConflictError(
        "The account state changed. Reload and try again."
      );
    }

    return tx.accountDeletionRequest.upsert({
      where: { userId },
      create: {
        userId,
        authUserId: userId,
        accountFingerprint: securityFingerprint(userId),
        requestedAt: now,
        scheduledFor,
      },
      update: {
        authUserId: userId,
        accountFingerprint: securityFingerprint(userId),
        status: AccountDeletionRequestStatus.PENDING,
        requestedAt: now,
        scheduledFor,
        processingStartedAt: null,
        completedAt: null,
        cancelledAt: null,
        attemptCount: 0,
        lastFailureCode: null,
      },
      select: { scheduledFor: true },
    });
  });
}

export async function reactivateAccount(userId: string) {
  const result = await prisma.user.updateMany({
    where: { id: userId, accountStatus: AccountStatus.DEACTIVATED },
    data: { accountStatus: AccountStatus.ACTIVE, deactivatedAt: null },
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
      data: { accountStatus: AccountStatus.ACTIVE, deactivatedAt: null },
    });
  });
}

export async function getAccountLifecycle(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountStatus: true,
      deactivatedAt: true,
      deletionRequest: { select: { scheduledFor: true, status: true } },
    },
  });
  if (!user) throw new AccountLifecycleConflictError("Account not found.");
  return user;
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
