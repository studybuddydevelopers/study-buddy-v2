// app/api/v1/login/route.ts

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { prisma } from "@/lib/prisma";
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
import { syncAuthAccountStatus } from "@/lib/guardian-authorization";

export async function POST(req: Request) {
  const parsedBody = await parseJsonRequest(req, REQUEST_LIMITS.publicFormJson);
  if (!parsedBody.ok) return parsedBody.response;
  if (!isRecord(parsedBody.data)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const body = parsedBody.data;
  const { identifier, password } = body;
  const captchaToken =
    typeof body?.captchaToken === "string" ? body.captchaToken : undefined;

  if (typeof identifier !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const rateLimitResponse = await enforceRateLimitRules([
    {
      scope: "auth:login:ip",
      identifier: getClientIp(req.headers),
      limit: 20,
      windowMs: 15 * 60_000,
    },
    {
      scope: "auth:login:account",
      identifier: identifier.trim().toLowerCase(),
      limit: 10,
      windowMs: 15 * 60_000,
    },
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  const res = NextResponse.json({ success: true });
  const supabaseConfig = getServerSupabaseConfig();

  // --------------------------
  // SUPABASE COOKIE-AWARE CLIENT
  // --------------------------
  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.key,
    {
      global: { fetch: fetchWithTimeout },
      cookies: {
        getAll() {
          return parseCookieHeader(req.headers.get("cookie"));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, { ...options, path: "/" });
          });
        },
      },
    }
  );

  // --------------------------
  // LOGIN ACTION
  // --------------------------
  const isEmail = /\S+@\S+\.\S+/.test(identifier);

  let authenticatedUserId: string | undefined;
  let authMetadataAccountStatus: string | undefined;
  try {
    const result = isEmail
      ? await supabase.auth.signInWithPassword({
          email: identifier,
          password,
          options: { captchaToken },
        })
      : await supabase.auth.signInWithPassword({
          phone: identifier,
          password,
          options: { captchaToken },
        });
    if (!result.error) {
      authenticatedUserId = result.data?.user?.id;
      authMetadataAccountStatus = result.data?.user?.user_metadata?.accountStatus;
    }
  } catch {
    // Network/provider failures deliberately use the same outward response as
    // rejected credentials. Never expose upstream authentication diagnostics.
  }

  if (!authenticatedUserId) {
    logSecurityEvent("login_failed", "warn", {
      accountFingerprint: securityFingerprint(identifier),
      ipFingerprint: securityFingerprint(getClientIp(req.headers)),
      loginKind: isEmail ? "email" : "phone",
    });
    return NextResponse.json(
      { error: "Invalid email/phone number or password." },
      { status: 401 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: authenticatedUserId },
    select: { accountStatus: true },
  });
  if (!dbUser) {
    logSecurityEvent("login_user_record_missing", "error", {
      accountFingerprint: securityFingerprint(identifier),
    });
    res.headers.set("X-Study-Buddy-Next", "/unauthorized");
    return res;
  }

  const nextPath =
    dbUser.accountStatus === "ACTIVE"
      ? "/dashboard"
      : dbUser.accountStatus === "AGE_VERIFICATION_REQUIRED"
        ? "/age-verification"
        : "/guardian-authorization-pending";
  if (authMetadataAccountStatus !== dbUser.accountStatus) {
    await syncAuthAccountStatus(authenticatedUserId, dbUser.accountStatus);
  }
  res.headers.set("X-Study-Buddy-Next", nextPath);
  return res;
}

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return [];

  return cookieHeader
    .split(";")
    .map((cookie) => {
      const [name, ...valueParts] = cookie.trim().split("=");
      return {
        name,
        value: valueParts.join("="),
      };
    })
    .filter((cookie) => cookie.name);
}
