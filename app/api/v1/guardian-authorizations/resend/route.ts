import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createGuardianAuthorizationToken,
  guardianAuthorizationExpiry,
  maskEmail,
  sendGuardianAuthorizationEmail,
} from "@/lib/guardian-authorization";
import { enforceRateLimitRules, getClientIp } from "@/lib/security/rate-limit";
import { logSecurityEvent, securityFingerprint } from "@/lib/security/audit-log";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ("errorResponse" in auth) return auth.errorResponse;
  const { user, dbUser } = auth;

  if (dbUser.accountStatus !== "GUARDIAN_AUTHORIZATION_REQUIRED") {
    return NextResponse.json({ error: "NOT_PENDING", message: "No guardian authorisation is pending for this account." }, { status: 409 });
  }

  const rateLimit = await enforceRateLimitRules([
    { scope: "guardian:resend:account", identifier: dbUser.id, limit: 3, windowMs: 24 * 60 * 60_000 },
    { scope: "guardian:resend:ip", identifier: getClientIp(request.headers), limit: 10, windowMs: 24 * 60 * 60_000 },
  ]);
  if (rateLimit) return rateLimit;

  const pending = await prisma.guardianAuthorization.findFirst({
    where: {
      studentUserId: dbUser.id,
      status: { in: ["PENDING", "EXPIRED"] },
    },
    orderBy: { createdAt: "desc" },
    include: { student: { select: { profile: { select: { firstName: true } } } } },
  });
  if (!pending) {
    return NextResponse.json({ error: "NOT_PENDING", message: "No guardian authorisation is pending for this account." }, { status: 409 });
  }

  const token = createGuardianAuthorizationToken();
  const expiresAt = guardianAuthorizationExpiry();
  await prisma.$transaction([
    prisma.guardianAuthorization.update({
      where: { id: pending.id },
      data: {
        status: "PENDING",
        tokenHash: token.tokenHash,
        tokenExpiresAt: expiresAt,
        requestedAt: new Date(),
      },
    }),
    prisma.guardianAuthorizationEvent.create({
      data: {
        authorizationId: pending.id,
        eventType: "REQUESTED",
        actorType: "STUDENT",
        ipFingerprint: securityFingerprint(getClientIp(request.headers)),
        details: { resend: true },
      },
    }),
  ]);

  try {
    await sendGuardianAuthorizationEmail({
      guardianName: pending.guardianName,
      guardianEmail: pending.guardianEmail,
      studentName: pending.student.profile?.firstName || user.user_metadata?.firstName || "the student",
      token: token.token,
      expiresAt,
    });
  } catch {
    logSecurityEvent("guardian_authorization_email_failed", "error", {
      accountFingerprint: securityFingerprint(dbUser.id),
      guardianFingerprint: securityFingerprint(pending.guardianEmail),
    });
    return NextResponse.json({ error: "EMAIL_DELIVERY_FAILED", message: "We could not send the email. Please try later or contact privacy@studybuddyng.com." }, { status: 503 });
  }

  return NextResponse.json({ success: true, guardianEmail: maskEmail(pending.guardianEmail) });
}
