// app/api/v1/reset-password/route.ts
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
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
  const { email } = body;
  const captchaToken =
    typeof body?.captchaToken === "string" ? body.captchaToken : undefined;

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const rateLimitResponse = await enforceRateLimitRules([
    {
      scope: "auth:password-reset:ip",
      identifier: getClientIp(req.headers),
      limit: 5,
      windowMs: 60 * 60_000,
    },
    {
      scope: "auth:password-reset:account",
      identifier: email.trim().toLowerCase(),
      limit: 3,
      windowMs: 60 * 60_000,
    },
  ]);
  if (rateLimitResponse) return rateLimitResponse;

  const res = NextResponse.json({ ok: true });
  const supabaseConfig = getServerSupabaseConfig();

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.key,
    {
      global: { fetch: fetchWithTimeout },
      cookies: {
        get(name: string) {
          return req.headers
            .get("cookie")
            ?.split("; ")
            .find((c) => c.startsWith(name + "="))
            ?.split("=")?.[1] ?? null;
        },
        set(name: string, value: string, options?: CookieOptions) {
          res.cookies.set(name, value, { ...options, path: "/" });
        },
        remove(name: string, options?: CookieOptions) {
          res.cookies.set(name, "", { ...options, maxAge: 0, path: "/" });
        },
      },
    }
  );

  // Supabase stores the PKCE verifier on this response before emailing the link.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: passwordResetRedirectUrl(req),
    captchaToken,
  });

  if (error) {
    // Deliberately return the same response for missing accounts, provider
    // throttling, and accepted requests to prevent account enumeration.
    logSecurityEvent("password_reset_request_failed", "warn", {
      accountFingerprint: securityFingerprint(email),
      ipFingerprint: securityFingerprint(getClientIp(req.headers)),
    });
  }

  return res;
}

function passwordResetRedirectUrl(req: Request) {
  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  if (configuredOrigin) {
    try {
      return new URL("/auth/password-reset", configuredOrigin).toString();
    } catch {
      // Fall through only outside production; production configuration errors
      // must not make an attacker-controlled Host header authoritative.
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_ORIGIN must be a valid absolute URL in production.");
  }
  return new URL("/auth/password-reset", req.url).toString();
}
