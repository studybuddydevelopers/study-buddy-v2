import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJsonObjectRequest, REQUEST_LIMITS } from "@/lib/security/request-body";
import { enforceRateLimitRules, getClientIp } from "@/lib/security/rate-limit";
import { hashGuardianAuthorizationToken } from "@/lib/guardian-authorization";

export async function POST(request: Request) {
  const parsed = await parseJsonObjectRequest(request, REQUEST_LIMITS.publicFormJson);
  if (!parsed.ok) return parsed.response;

  const token = typeof parsed.data.token === "string" ? parsed.data.token : "";
  if (token.length < 32 || token.length > 128) {
    return invalidLink();
  }

  const tokenHash = hashGuardianAuthorizationToken(token);
  const rateLimit = await enforceRateLimitRules([
    { scope: "guardian:lookup:ip", identifier: getClientIp(request.headers), limit: 30, windowMs: 60 * 60_000 },
    { scope: "guardian:lookup:token", identifier: tokenHash, limit: 10, windowMs: 60 * 60_000 },
  ]);
  if (rateLimit) return rateLimit;

  const authorization = await prisma.guardianAuthorization.findUnique({
    where: { tokenHash },
    select: {
      guardianName: true,
      relationship: true,
      status: true,
      tokenExpiresAt: true,
      student: {
        select: { profile: { select: { firstName: true, lastNames: true } } },
      },
    },
  });
  if (!authorization) return invalidLink();

  return NextResponse.json(
    {
      valid: true,
      status: authorization.status,
      expired: authorization.tokenExpiresAt <= new Date(),
      guardianName: authorization.guardianName,
      relationship: authorization.relationship,
      studentName: authorization.student.profile
        ? `${authorization.student.profile.firstName} ${authorization.student.profile.lastNames}`
        : "the student",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

function invalidLink() {
  return NextResponse.json(
    { error: "INVALID_OR_EXPIRED_LINK", message: "This link is invalid or has expired." },
    { status: 404, headers: { "Cache-Control": "no-store" } }
  );
}
