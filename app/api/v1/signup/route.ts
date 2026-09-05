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

export async function POST(req: Request) {
  const parsedBody = await parseJsonRequest(req, REQUEST_LIMITS.publicFormJson);
  if (!parsedBody.ok) return parsedBody.response;
  if (!isRecord(parsedBody.data)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const body = parsedBody.data;
  const { firstName, lastNames, email, phoneNumber, password } = body;
  const middleNames =
    typeof body.middleNames === "string" ? body.middleNames : undefined;
  const captchaToken =
    typeof body?.captchaToken === "string" ? body.captchaToken : undefined;

  if (
    typeof firstName !== "string" ||
    typeof lastNames !== "string" ||
    typeof email !== "string" ||
    typeof phoneNumber !== "string" ||
    typeof password !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
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
      identifier: email.trim().toLowerCase(),
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
  try {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstName, middleNames, lastNames, phoneNumber },
        captchaToken,
      },
    });
    userId = result.data.user?.id;
    authFailed = Boolean(result.error);
  } catch {
    authFailed = true;
  }

  if (authFailed) {
    logSecurityEvent("signup_failed", "warn", {
      accountFingerprint: securityFingerprint(email),
      ipFingerprint: securityFingerprint(getClientIp(req.headers)),
    });
    return NextResponse.json(
      { error: "Sign-up could not be completed with those details." },
      { status: 400 }
    );
  }

  if (!userId) {
    logSecurityEvent("signup_identity_missing", "error", {
      accountFingerprint: securityFingerprint(email),
    });
    return NextResponse.json(
      { error: "Sign-up could not be completed with those details." },
      { status: 500 }
    );
  }

  try {
    // 2. Seed Prisma DB
    await prisma.$transaction([
      prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          profile: {
            create: {
              firstName,
              middleNames,
              lastNames,
              phoneNumber,
              preferredSubjects: [],
            },
          },
        update: {},
      }),
      prisma.userSettings.upsert({
        where: { userId },
        create: { userId },
        update: {},
      }),
    ]);

    // 3. Initialize subject progress at 0% for all subjects
    const subjects = await prisma.subject.findMany({ select: { id: true } });
    if (subjects.length > 0) {
      const existing = await prisma.progressTrack.findMany({
        where: { userId },
        select: { subjectId: true },
      });
      const existingSet = new Set(existing.map((entry) => entry.subjectId));
      const newTracks = subjects
        .filter((subject) => !existingSet.has(subject.id))
        .map((subject) => ({
          userId,
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
      accountFingerprint: securityFingerprint(email),
    });
    return NextResponse.json(
      { error: "Sign-up could not be completed with those details." },
      { status: 500 }
    );
  }

  return res; // return SAME RESPONSE INSTANCE
}
