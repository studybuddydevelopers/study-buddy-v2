import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/auth";
import { parseJsonObjectRequest, REQUEST_LIMITS } from "@/lib/security/request-body";
import {
  CHILD_PRIVACY_NOTICE_VERSION,
  parseBirthDate,
  TERMS_VERSION,
} from "@/lib/account-age";
import {
  createGuardianAuthorizationToken,
  guardianAuthorizationExpiry,
  isValidEmail,
  maskEmail,
  normalizeEmail,
  sendGuardianAuthorizationEmail,
  syncAuthAccountStatus,
} from "@/lib/guardian-authorization";
import { getClientIp } from "@/lib/security/rate-limit";
import { logSecurityEvent, securityFingerprint } from "@/lib/security/audit-log";
import { accountStatusDestination } from "@/lib/account-status";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const parsed = await parseJsonObjectRequest(request, REQUEST_LIMITS.publicFormJson);
  if (!parsed.ok) return parsed.response;

  const birthDate = parseBirthDate(parsed.data.dateOfBirth);
  if (!birthDate.ok) {
    return NextResponse.json(
      { error: "INVALID_DATE_OF_BIRTH", message: birthDate.message },
      { status: 400 }
    );
  }
  const { user, dbUser } = auth;
  if (dbUser.accountStatus !== "AGE_VERIFICATION_REQUIRED") {
    return NextResponse.json({
      success: true,
      nextPath:
        dbUser.accountStatus === "ACTIVE"
          ? "/dashboard"
          : accountStatusDestination(dbUser.accountStatus) ?? "/unauthorized",
    });
  }

  if (birthDate.ageBand === "TOO_YOUNG") {
    await prisma.$transaction([
      prisma.userProfile.update({
        where: { userId: dbUser.id },
        data: { dateOfBirth: birthDate.date },
      }),
      prisma.user.update({
        where: { id: dbUser.id },
        data: {
          accountStatus: "BELOW_MINIMUM_AGE",
          aiAccessAuthorized: false,
        },
      }),
    ]);
    await syncAuthAccountStatus(dbUser.id, "BELOW_MINIMUM_AGE");
    return NextResponse.json(
      {
        error: "MINIMUM_AGE_NOT_MET",
        message: "Study Buddy accounts are available from age 13.",
        nextPath: "/account-unavailable",
      },
      { status: 403 }
    );
  }

  if (parsed.data.acceptedTerms !== true) {
    return NextResponse.json(
      { error: "TERMS_NOT_ACCEPTED", message: "Accept the current terms to continue." },
      { status: 400 }
    );
  }

  if (birthDate.ageBand === "ADULT") {
    await prisma.$transaction([
      prisma.userProfile.update({
        where: { userId: dbUser.id },
        data: { dateOfBirth: birthDate.date },
      }),
      prisma.user.update({
        where: { id: dbUser.id },
        data: {
          accountStatus: "ACTIVE",
          aiAccessAuthorized: true,
          termsAcceptedAt: new Date(),
          termsVersion: TERMS_VERSION,
        },
      }),
    ]);
    await syncAuthAccountStatus(dbUser.id, "ACTIVE");
    return NextResponse.json({ success: true, nextPath: "/dashboard" });
  }

  const guardianName =
    typeof parsed.data.guardianName === "string"
      ? parsed.data.guardianName.trim()
      : "";
  const guardianEmail =
    typeof parsed.data.guardianEmail === "string"
      ? normalizeEmail(parsed.data.guardianEmail)
      : "";
  const relationship = parsed.data.guardianRelationship;
  const studentEmail = normalizeEmail(user.email ?? "");
  if (
    guardianName.length < 2 ||
    guardianName.length > 160 ||
    !isValidEmail(guardianEmail) ||
    guardianEmail === studentEmail ||
    (relationship !== "PARENT" && relationship !== "LEGAL_GUARDIAN")
  ) {
    return NextResponse.json(
      {
        error: "INVALID_GUARDIAN_DETAILS",
        message: "Enter a parent or legal guardian's name and a different, valid email address.",
      },
      { status: 400 }
    );
  }

  const token = createGuardianAuthorizationToken();
  const expiresAt = guardianAuthorizationExpiry();
  const ipFingerprint = securityFingerprint(getClientIp(request.headers));
  await prisma.$transaction(async (transaction) => {
    const previous = await transaction.guardianAuthorization.findMany({
      where: { studentUserId: dbUser.id, status: "PENDING" },
      select: { id: true },
    });
    if (previous.length) {
      await transaction.guardianAuthorization.updateMany({
        where: { id: { in: previous.map(({ id }) => id) }, status: "PENDING" },
        data: { status: "SUPERSEDED" },
      });
      await transaction.guardianAuthorizationEvent.createMany({
        data: previous.map(({ id }) => ({
          authorizationId: id,
          eventType: "SUPERSEDED" as const,
          actorType: "STUDENT",
          ipFingerprint,
        })),
      });
    }

    await transaction.userProfile.update({
      where: { userId: dbUser.id },
      data: { dateOfBirth: birthDate.date },
    });
    await transaction.user.update({
      where: { id: dbUser.id },
      data: {
        accountStatus: "GUARDIAN_AUTHORIZATION_REQUIRED",
        aiAccessAuthorized: false,
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    });
    await transaction.guardianAuthorization.create({
      data: {
        studentUserId: dbUser.id,
        studentEmail,
        guardianName,
        guardianEmail,
        relationship,
        tokenHash: token.tokenHash,
        tokenExpiresAt: expiresAt,
        noticeVersion: CHILD_PRIVACY_NOTICE_VERSION,
        termsVersion: TERMS_VERSION,
        events: {
          create: {
            eventType: "REQUESTED",
            actorType: "STUDENT",
            ipFingerprint,
            details: { ageBand: "13_TO_17" },
          },
        },
      },
    });
  });

  await syncAuthAccountStatus(dbUser.id, "GUARDIAN_AUTHORIZATION_REQUIRED");
  let emailDeliverySucceeded = true;
  try {
    await sendGuardianAuthorizationEmail({
      guardianName,
      guardianEmail,
      studentName: user.user_metadata?.firstName || "the student",
      token: token.token,
      expiresAt,
    });
  } catch {
    emailDeliverySucceeded = false;
    logSecurityEvent("guardian_authorization_email_failed", "error", {
      accountFingerprint: securityFingerprint(studentEmail),
      guardianFingerprint: securityFingerprint(guardianEmail),
    });
  }

  return NextResponse.json({
    success: true,
    nextPath: "/guardian-authorization-pending",
    guardianEmail: maskEmail(guardianEmail),
    emailDeliverySucceeded,
  });
}
