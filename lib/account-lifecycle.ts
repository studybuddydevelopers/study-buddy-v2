import { AccountDeletionRequestStatus, AccountStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  logSecurityEvent,
  securityFingerprint,
} from "@/lib/security/audit-log";

export const ACTIVE_DELETION_DAYS = 30;
export const BACKUP_EXPIRY_DAYS = 90;
export const DELETION_CANCELLATION_DAYS = 15;
const DELETION_DELAY_MS = DELETION_CANCELLATION_DAYS * 24 * 60 * 60 * 1_000;
const PROCESSING_LEASE_MS = 15 * 60 * 1_000;

export class AccountLifecycleConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountLifecycleConflictError";
  }
}

export async function deactivateAccount(userId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: userId, accountStatus: AccountStatus.ACTIVE },
      data: {
        accountStatus: AccountStatus.DEACTIVATED,
        deactivatedAt: new Date(),
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
