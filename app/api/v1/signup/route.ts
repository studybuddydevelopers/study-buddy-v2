// app/api/v1/signup/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { isRecord } from "@/lib/type-utils";
import {
  parseJsonRequest,
  REQUEST_LIMITS,
} from "@/lib/security/request-body";
import {
  enforceRateLimitRules,
  getClientIp,
} from "@/lib/security/rate-limit";
import { fetchWithTimeout } from "@/lib/security/timeouts";
import {
  logSecurityEvent,
  securityFingerprint,
} from "@/lib/security/audit-log";
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
} from "@/lib/guardian-authorization";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const parsedBody = await parseJsonRequest(req, REQUEST_LIMITS.publicFormJson);
  if (!parsedBody.ok) return parsedBody.response;
  if (!isRecord(parsedBody.data)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const body = parsedBody.data;
  const {
    firstName,
    lastNames,
    email,
    phoneNumber,
    password,
    dateOfBirth,
    acceptedTerms,
  } = body;
  const middleNames =
    typeof body.middleNames === "string" ? body.middleNames : undefined;
  const captchaToken =
    typeof body?.captchaToken === "string" ? body.captchaToken : undefined;

  if (
    typeof firstName !== "string" ||
    typeof lastNames !== "string" ||
    typeof email !== "string" ||
    typeof phoneNumber !== "string" ||
    typeof password !== "string" ||
    typeof dateOfBirth !== "string" ||
    acceptedTerms !== true
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const parsedBirthDate = parseBirthDate(dateOfBirth);
  if (!parsedBirthDate.ok) {
    return NextResponse.json(
      { error: "INVALID_DATE_OF_BIRTH", message: parsedBirthDate.message },
      { status: 400 }
    );
  }
  if (parsedBirthDate.ageBand === "TOO_YOUNG") {
    return NextResponse.json(
      {
        error: "MINIMUM_AGE_NOT_MET",
        message: "Study Buddy accounts are available from age 13.",
      },
      { status: 403 }
    );
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }
  if (
    firstName.trim().length < 1 ||
    firstName.trim().length > 80 ||
    lastNames.trim().length < 1 ||
    lastNames.trim().length > 160 ||
    (middleNames?.trim().length ?? 0) > 160 ||
    phoneNumber.trim().length < 6 ||
    phoneNumber.trim().length > 32 ||
    password.length < 6 ||
    password.length > 128
  ) {
    return NextResponse.json(
      { error: "Some account details are invalid or too long." },
      { status: 400 }
    );
  }

  const isMinor = parsedBirthDate.ageBand === "MINOR";
  const guardianName =
    typeof body.guardianName === "string" ? body.guardianName.trim() : "";
  const guardianEmail =
    typeof body.guardianEmail === "string"
      ? normalizeEmail(body.guardianEmail)
      : "";
  const guardianRelationship = body.guardianRelationship;
  if (
    isMinor &&
    (guardianName.length < 2 ||
      guardianName.length > 160 ||
      !isValidEmail(guardianEmail) ||
      guardianEmail === normalizedEmail ||
      (guardianRelationship !== "PARENT" &&
        guardianRelationship !== "LEGAL_GUARDIAN"))
  ) {
    return NextResponse.json(
      {
        error: "INVALID_GUARDIAN_DETAILS",
        message:
          "A user aged 13–17 must provide a parent or legal guardian's name and a different, valid email address.",
      },
      { status: 400 }
    );
  }

  const rateLimitResponse = await enforceRateLimitRules([
    {
      scope: "auth:signup:ip",
      identifier: getClientIp(req.headers),
      limit: 5,
      windowMs: 60 * 60_000,
    },
    {
      scope: "auth:signup:account",
      identifier: normalizedEmail,
      limit: 3,
      windowMs: 60 * 60_000,
    },
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  // MUST be created before supabase so cookies attach to it
  const res = NextResponse.json({ success: true });
  const supabaseConfig = getServerSupabaseConfig();

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.key,
    {
      global: { fetch: fetchWithTimeout },
      cookies: {
        get(name) {
          return (
            req.headers
              .get("cookie")
              ?.split("; ")
              .find((c) => c.startsWith(`${name}=`))
              ?.split("=")[1] ?? null
          );
        },

        set(name, value, options) {
          res.cookies.set(name, value, { ...options, path: "/" });
        },

        remove(name, options) {
          res.cookies.set(name, "", {
            ...options,
            maxAge: 0,
            path: "/",
          });
        },
      },
    }
  );

  // 1. Create Supabase auth user
  let userId: string | undefined;
  let authFailed = false;
  let authUserWasCreated = false;
  try {
    const result = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          firstName: firstName.trim(),
          middleNames: middleNames?.trim() || undefined,
          lastNames: lastNames.trim(),
          phoneNumber: phoneNumber.trim(),
          accountStatus: isMinor
            ? "GUARDIAN_AUTHORIZATION_REQUIRED"
            : "ACTIVE",
        },
        captchaToken,
      },
    });
    userId = result.data.user?.id;
    authUserWasCreated = (result.data.user?.identities?.length ?? 0) > 0;
    authFailed = Boolean(result.error);
  } catch {
    authFailed = true;
  }

  if (authFailed) {
    logSecurityEvent("signup_failed", "warn", {
      accountFingerprint: securityFingerprint(normalizedEmail),
      ipFingerprint: securityFingerprint(getClientIp(req.headers)),
    });
    return NextResponse.json(
      { error: "Sign-up could not be completed with those details." },
      { status: 400 }
    );
  }

  if (!userId) {
    logSecurityEvent("signup_identity_missing", "error", {
      accountFingerprint: securityFingerprint(normalizedEmail),
    });
    return NextResponse.json(
      { error: "Sign-up could not be completed with those details." },
      { status: 500 }
    );
  }
  const persistedUserId = userId;
  const guardianToken = isMinor
    ? createGuardianAuthorizationToken()
    : undefined;
  const guardianTokenExpiresAt = isMinor
    ? guardianAuthorizationExpiry()
    : undefined;

  try {
    // 2. Seed Prisma DB
    await prisma.$transaction(async (transaction) => {
      await transaction.user.create({
        data: {
          id: persistedUserId,
          accountStatus: isMinor
            ? "GUARDIAN_AUTHORIZATION_REQUIRED"
            : "ACTIVE",
          aiAccessAuthorized: !isMinor,
          termsAcceptedAt: new Date(),
          termsVersion: TERMS_VERSION,
          profile: {
            create: {
              firstName: firstName.trim(),
              middleNames: middleNames?.trim() || null,
              lastNames: lastNames.trim(),
              phoneNumber: phoneNumber.trim(),
              preferredSubjects: [],
              dateOfBirth: parsedBirthDate.date,
            },
          },
        },
      });
      await transaction.userSettings.create({
        data: { userId: persistedUserId },
      });

      if (
        isMinor &&
        guardianToken &&
        guardianTokenExpiresAt &&
        (guardianRelationship === "PARENT" ||
          guardianRelationship === "LEGAL_GUARDIAN")
      ) {
        await transaction.guardianAuthorization.create({
          data: {
            studentUserId: persistedUserId,
            studentEmail: normalizedEmail,
            guardianName,
            guardianEmail,
            relationship: guardianRelationship,
            tokenHash: guardianToken.tokenHash,
            tokenExpiresAt: guardianTokenExpiresAt,
            noticeVersion: CHILD_PRIVACY_NOTICE_VERSION,
            termsVersion: TERMS_VERSION,
            events: {
              create: {
                eventType: "REQUESTED",
                actorType: "STUDENT",
                ipFingerprint: securityFingerprint(getClientIp(req.headers)),
                details: { ageBand: "13_TO_17" },
              },
            },
          },
        });
      }
    });

    // 3. Initialize subject progress at 0% for all subjects
    const subjects = await prisma.subject.findMany({ select: { id: true } });
    if (subjects.length > 0) {
      const existing = await prisma.progressTrack.findMany({
        where: { userId: persistedUserId },
        select: { subjectId: true },
      });
      const existingSet = new Set(existing.map((entry) => entry.subjectId));
      const newTracks = subjects
        .filter((subject) => !existingSet.has(subject.id))
        .map((subject) => ({
          userId: persistedUserId,
          subjectId: subject.id,
          progressPercentage: 0,
        }));
      if (newTracks.length > 0) {
        await prisma.progressTrack.createMany({
          data: newTracks,
          skipDuplicates: true,
        });
      }
    }
  } catch {
    logSecurityEvent("signup_persistence_failed", "error", {
      accountFingerprint: securityFingerprint(normalizedEmail),
    });
    if (authUserWasCreated) {
      try {
        await getSupabaseAdminClient().auth.admin.deleteUser(persistedUserId);
      } catch {
        logSecurityEvent("signup_auth_rollback_failed", "error", {
          accountFingerprint: securityFingerprint(normalizedEmail),
        });
      }
    }
    return NextResponse.json(
      { error: "Sign-up could not be completed with those details." },
      { status: 500 }
    );
  }

  if (isMinor && guardianToken && guardianTokenExpiresAt) {
    try {
      await sendGuardianAuthorizationEmail({
        guardianName,
        guardianEmail,
        studentName: firstName.trim(),
        token: guardianToken.token,
        expiresAt: guardianTokenExpiresAt,
      });
      logSecurityEvent("guardian_authorization_email_sent", "info", {
        accountFingerprint: securityFingerprint(normalizedEmail),
        guardianFingerprint: securityFingerprint(guardianEmail),
      });
    } catch {
      logSecurityEvent("guardian_authorization_email_failed", "error", {
        accountFingerprint: securityFingerprint(normalizedEmail),
        guardianFingerprint: securityFingerprint(guardianEmail),
      });
      res.headers.set("X-Guardian-Email-Delivery", "failed");
    }
    res.headers.set("X-Study-Buddy-Next", "/guardian-authorization-pending");
    res.headers.set("X-Guardian-Email", maskEmail(guardianEmail));
  } else {
    res.headers.set(
      "X-Study-Buddy-Next",
      `/verify-email?email=${encodeURIComponent(normalizedEmail)}`
    );
  }

  return res; // return SAME RESPONSE INSTANCE
}
