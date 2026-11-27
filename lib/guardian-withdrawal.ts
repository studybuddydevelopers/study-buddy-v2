import { NextResponse } from "next/server";
import { ageOnDate, INDEPENDENT_ACCOUNT_AGE, MINIMUM_ACCOUNT_AGE } from "@/lib/account-age";
import { requireUser } from "@/lib/auth";
import { syncAuthAccountStatus } from "@/lib/guardian-authorization";
import { PRIVACY_EMAIL } from "@/lib/legal-entity";
import { prisma } from "@/lib/prisma";
import { logSecurityEvent, securityFingerprint } from "@/lib/security/audit-log";
import { fetchWithTimeout } from "@/lib/security/timeouts";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function requireGuardianWithdrawalOperator() {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth;
  const operatorIds = (process.env.GUARDIAN_WITHDRAWAL_OPERATOR_USER_IDS ?? "")
    .split(",").map((id) => id.trim()).filter(Boolean);
  if (!auth.user.email_confirmed_at || !operatorIds.includes(auth.dbUser.id)) {
    return {
      errorResponse: NextResponse.json(
        { error: "SUPPORT_ACCESS_REQUIRED" },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  return auth;
}

export class GuardianWithdrawalConflict extends Error {}

export async function withdrawGuardianAuthorisation(input: {
  authorizationId: string;
  caseReference: string;
  operatorUserId: string;
}) {
  const authorization = await prisma.$transaction(async (tx) => {
    const grant = await tx.guardianAuthorization.findUnique({
      where: { id: input.authorizationId },
      select: {
        id: true,
        status: true,
        studentUserId: true,
        guardianEmail: true,
        withdrawalStudentNotifiedAt: true,
        withdrawalGuardianNotifiedAt: true,
        student: { select: { accountStatus: true, profile: { select: { dateOfBirth: true } } } },
        events: { where: { eventType: "WITHDRAWN" }, orderBy: { createdAt: "desc" }, take: 1, select: { details: true } },
      },
    });
    if (!grant) throw new GuardianWithdrawalConflict("No matching authorisation was found.");

    if (grant.status === "WITHDRAWN" && grant.student.accountStatus === "GUARDIAN_AUTHORIZATION_WITHDRAWN") {
      const evidence = grant.events[0]?.details;
      if (evidence && typeof evidence === "object" && !Array.isArray(evidence) &&
          evidence.caseReference === input.caseReference) return grant;
      throw new GuardianWithdrawalConflict("Use the original privacy case reference to retry these notices.");
    }

    const birthDate = grant.student.profile?.dateOfBirth;
    const now = new Date();
    const age = birthDate ? ageOnDate(birthDate, now) : NaN;
    if (grant.status !== "GRANTED" || !birthDate || !Number.isFinite(age) ||
        age < MINIMUM_ACCOUNT_AGE || age >= INDEPENDENT_ACCOUNT_AGE) {
      throw new GuardianWithdrawalConflict("This authorisation cannot be withdrawn from this form.");
    }

    const restricted = await tx.user.updateMany({
      where: {
        id: grant.studentUserId,
        accountStatus: { in: ["ACTIVE", "DEACTIVATED"] },
        profile: { is: { dateOfBirth: birthDate } },
      },
      data: {
        accountStatus: "GUARDIAN_AUTHORIZATION_WITHDRAWN",
        aiAccessAuthorized: false,
        inactiveDeletionAt: null,
      },
    });
    if (!restricted.count) {
      throw new GuardianWithdrawalConflict("The account changed or is already in another privacy process.");
    }
    const withdrawn = await tx.guardianAuthorization.updateMany({
      where: { id: grant.id, status: "GRANTED" },
      data: { status: "WITHDRAWN", withdrawnAt: now },
    });
    if (!withdrawn.count) throw new GuardianWithdrawalConflict("The authorisation changed. Review the case before retrying.");

    // A request awaiting the student's confirmation cannot become a purge
    // while the guardian chooses the next step.
    await tx.accountDeletionRequest.updateMany({
      where: { userId: grant.studentUserId, status: "AWAITING_CONFIRMATION" },
      data: { status: "CANCELLED", cancelledAt: now, confirmationTokenHash: null, confirmationTokenExpiresAt: null },
    });
    await tx.guardianAuthorizationEvent.create({
      data: {
        authorizationId: grant.id,
        eventType: "WITHDRAWN",
        actorType: "PRIVACY_OPERATOR",
        details: { caseReference: input.caseReference, operatorUserId: input.operatorUserId },
      },
    });
    return grant;
  });

  await syncAuthAccountStatus(authorization.studentUserId, "GUARDIAN_AUTHORIZATION_WITHDRAWN");
  const [studentNotified, guardianNotified] = await Promise.all([
    notifyRecipient(authorization, "student"),
    notifyRecipient(authorization, "guardian"),
  ]);
  return { studentNotified, guardianNotified };
}

async function notifyRecipient(
  authorization: {
    id: string;
    studentUserId: string;
    guardianEmail: string;
    withdrawalStudentNotifiedAt: Date | null;
    withdrawalGuardianNotifiedAt: Date | null;
  },
  recipient: "student" | "guardian",
) {
  const deliveredKey = recipient === "student"
    ? "withdrawalStudentNotifiedAt"
    : "withdrawalGuardianNotifiedAt";
  if (authorization[deliveredKey]) return true;

  try {
    let email = authorization.guardianEmail;
    if (recipient === "student") {
      const { data, error } = await getSupabaseAdminClient().auth.admin.getUserById(authorization.studentUserId);
      if (error || !data.user?.email || !data.user.email_confirmed_at) throw new Error("Student email unavailable.");
      email = data.user.email;
    }
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.TRANSACTIONAL_EMAIL_FROM?.trim();
    if (!apiKey || !from) throw new Error("Withdrawal notices are not configured.");

    const response = await fetchWithTimeout("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `guardian-withdrawal-${authorization.id}-${recipient}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        reply_to: PRIVACY_EMAIL,
        subject: "Guardian authorisation withdrawn for a Study Buddy account",
        text: [
          "Study Buddy has recorded a verified withdrawal of guardian authorisation. The learner account is restricted and its saved work is still held securely.",
          recipient === "guardian"
            ? `Reply or email ${PRIVACY_EMAIL} to discuss reauthorisation or permanent deletion.`
            : `Ask your parent or guardian, or email ${PRIVACY_EMAIL}, for help with what happens next.`,
        ].join("\n\n"),
      }),
    });
    if (!response.ok) throw new Error("Provider did not accept the notice.");

    await prisma.guardianAuthorization.updateMany({
      where: { id: authorization.id, status: "WITHDRAWN", [deliveredKey]: null },
      data: { [deliveredKey]: new Date() },
    });
    return true;
  } catch {
    logSecurityEvent("guardian_withdrawal_notice_failed", "warn", {
      accountFingerprint: securityFingerprint(authorization.studentUserId),
      recipient,
    });
    return false;
  }
}
