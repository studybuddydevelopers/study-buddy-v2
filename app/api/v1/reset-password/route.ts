// app/api/v1/reset-password/route.ts
import { after, NextResponse } from "next/server";
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
import { authRedirectUrl } from "@/lib/supabase/auth-redirect";
import { processPasswordResetLimitAlert } from "@/lib/password-reset-security";

const HOUR_MS = 60 * 60_000;
const DEFAULT_PASSWORD_RESET_ACCOUNT_LIMIT = 3;
const DEFAULT_PASSWORD_RESET_IP_LIMIT = 300;
const DEFAULT_PASSWORD_RESET_GLOBAL_LIMIT = 1_000;

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

  const normalizedEmail = email.trim().toLowerCase();
  const rateLimitWindowMs = positiveIntegerFromEnv(
    "PASSWORD_RESET_RATE_LIMIT_WINDOW_MS",
    HOUR_MS
  );
  const rateLimitResponse = await enforceRateLimitRules(
    [
      // Check the account first so repeated attacks against one address do not
      // consume a shared school, library, or household IP's aggregate budget.
      {
        scope: "auth:password-reset:account",
        identifier: normalizedEmail,
        limit: positiveIntegerFromEnv(
          "PASSWORD_RESET_RATE_LIMIT_ACCOUNT_MAX",
          DEFAULT_PASSWORD_RESET_ACCOUNT_LIMIT
        ),
        windowMs: rateLimitWindowMs,
      },
      {
        scope: "auth:password-reset:ip",
        identifier: getClientIp(req.headers),
        limit: positiveIntegerFromEnv(
          "PASSWORD_RESET_RATE_LIMIT_IP_MAX",
          DEFAULT_PASSWORD_RESET_IP_LIMIT
        ),
        windowMs: rateLimitWindowMs,
      },
      {
        scope: "auth:password-reset:global",
        identifier: "all-password-reset-requests",
        limit: positiveIntegerFromEnv(
          "PASSWORD_RESET_RATE_LIMIT_GLOBAL_MAX",
          DEFAULT_PASSWORD_RESET_GLOBAL_LIMIT
        ),
        windowMs: rateLimitWindowMs,
      },
    ],
    (rejection) => {
      if (
        rejection.scope === "auth:password-reset:account" &&
        rejection.firstRejection
      ) {
        // Next.js keeps the Railway request alive long enough to finish this
        // callback without delaying or changing the public 429 response.
        after(() =>
          processPasswordResetLimitAlert({ email: normalizedEmail })
        );
      }
    }
  );
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
  let failed = false;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: authRedirectUrl("/auth/password-reset", req.url),
      captchaToken,
    });
    failed = Boolean(error);
  } catch {
    failed = true;
  }

  if (failed) {
    // Deliberately return the same response for missing accounts, provider
    // throttling, and accepted requests to prevent account enumeration.
    logSecurityEvent("password_reset_request_failed", "warn", {
      accountFingerprint: securityFingerprint(normalizedEmail),
      ipFingerprint: securityFingerprint(getClientIp(req.headers)),
    });
  }

  return res;
}

function positiveIntegerFromEnv(name: string, fallback: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
