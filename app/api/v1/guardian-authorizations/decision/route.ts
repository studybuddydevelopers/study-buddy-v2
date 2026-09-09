import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJsonObjectRequest, REQUEST_LIMITS } from "@/lib/security/request-body";
import { enforceRateLimitRules, getClientIp } from "@/lib/security/rate-limit";
import { hashGuardianAuthorizationToken, syncAuthAccountStatus } from "@/lib/guardian-authorization";
import { logSecurityEvent, securityFingerprint } from "@/lib/security/audit-log";

export async function POST(request: Request) {
  const parsed = await parseJsonObjectRequest(request, REQUEST_LIMITS.publicFormJson);
  if (!parsed.ok) return parsed.response;

  const token = typeof parsed.data.token === "string" ? parsed.data.token : "";
  const decision = parsed.data.decision;
  if (token.length < 32 || token.length > 128 || (decision !== "GRANT" && decision !== "DENY")) {
    return NextResponse.json({ error: "INVALID_REQUEST", message: "This authorisation request is invalid." }, { status: 400 });
  }

  const tokenHash = hashGuardianAuthorizationToken(token);
  const rateLimit = await enforceRateLimitRules([
    { scope: "guardian:decision:ip", identifier: getClientIp(request.headers), limit: 20, windowMs: 60 * 60_000 },
    { scope: "guardian:decision:token", identifier: tokenHash, limit: 8, windowMs: 60 * 60_000 },
  ]);
  if (rateLimit) return rateLimit;

  const authorization = await prisma.guardianAuthorization.findUnique({
    where: { tokenHash },
    select: { id: true, studentUserId: true, status: true, tokenExpiresAt: true },
  });
  if (!authorization) {
    return NextResponse.json({ error: "INVALID_OR_EXPIRED_LINK", message: "This link is invalid or has expired." }, { status: 404 });
  }

  if (authorization.status !== "PENDING") {
    return NextResponse.json({ error: "ALREADY_DECIDED", message: "This request has already been decided or replaced." }, { status: 409 });
  }

  if (authorization.tokenExpiresAt <= new Date()) {
    const changed = await prisma.guardianAuthorization.updateMany({
      where: { id: authorization.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    if (changed.count) {
      await prisma.guardianAuthorizationEvent.create({
        data: { authorizationId: authorization.id, eventType: "EXPIRED", actorType: "SYSTEM" },
      });
    }
    return NextResponse.json({ error: "INVALID_OR_EXPIRED_LINK", message: "This link has expired. The student can request another one after signing in." }, { status: 410 });
  }

  const granting = decision === "GRANT";
  if (
    granting &&
    (parsed.data.confirmsAuthority !== true || parsed.data.acceptsNotices !== true)
  ) {
    return NextResponse.json(
      { error: "CONFIRMATION_REQUIRED", message: "Confirm your authority and review the notices before approving." },
      { status: 400 }
    );
  }
  const aiAuthorized = granting && parsed.data.aiAuthorized === true;
  const ipFingerprint = securityFingerprint(getClientIp(request.headers));
  const changed = await prisma.$transaction(async (transaction) => {
    const update = await transaction.guardianAuthorization.updateMany({
      where: { id: authorization.id, status: "PENDING", tokenExpiresAt: { gt: new Date() } },
      data: {
        status: granting ? "GRANTED" : "DENIED",
        decidedAt: new Date(),
        aiAuthorized: granting ? aiAuthorized : false,
      },
    });
    if (!update.count) return false;

    await transaction.user.update({
      where: { id: authorization.studentUserId },
      data: {
        accountStatus: granting ? "ACTIVE" : "GUARDIAN_AUTHORIZATION_DENIED",
        aiAccessAuthorized: aiAuthorized,
      },
    });
    await transaction.guardianAuthorizationEvent.create({
      data: {
        authorizationId: authorization.id,
        eventType: granting ? "GRANTED" : "DENIED",
        actorType: "GUARDIAN",
        ipFingerprint,
        details: granting
          ? { accountAndLearningAuthorized: true, aiAuthorized }
          : { accountAndLearningAuthorized: false, aiAuthorized: false },
      },
    });
    return true;
  });

  if (!changed) {
    return NextResponse.json({ error: "ALREADY_DECIDED", message: "This request has already been decided or expired." }, { status: 409 });
  }

  const accountStatus = granting ? "ACTIVE" : "GUARDIAN_AUTHORIZATION_DENIED";
  await syncAuthAccountStatus(authorization.studentUserId, accountStatus);
  logSecurityEvent(`guardian_authorization_${granting ? "granted" : "denied"}`, "info", {
    accountFingerprint: securityFingerprint(authorization.studentUserId),
    aiAuthorized,
  });

  return NextResponse.json({ success: true, decision });
}
