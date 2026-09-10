import type { NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const SERVER_TO_SERVER_PATHS = new Set([
  "/api/v1/account/deletion/cron",
  "/api/v1/ai/recommendations/cron",
  "/api/v1/payments/webhook",
  "/api/v1/whatsapp/webhook",
]);
const SUPABASE_AUTH_COOKIE = /^sb-[A-Za-z0-9_-]+-auth-token(?:\.\d+)?$/;

export type CsrfValidationResult =
  | { ok: true }
  | {
      ok: false;
      reason: "MISSING_ORIGIN" | "INVALID_ORIGIN" | "UNTRUSTED_ORIGIN";
    };

/**
 * Enforce an exact Origin match for unsafe API requests that carry a Supabase
 * session cookie. Signed webhooks and the authenticated cron endpoint use
 * their own non-cookie credentials and are deliberately excluded.
 */
export function validateCookieMutationOrigin(
  request: NextRequest
): CsrfValidationResult {
  const pathname = withoutTrailingSlash(request.nextUrl.pathname);

  if (
    !pathname.startsWith("/api/") ||
    SAFE_METHODS.has(request.method.toUpperCase()) ||
    SERVER_TO_SERVER_PATHS.has(pathname) ||
    !hasSupabaseAuthCookie(request)
  ) {
    return { ok: true };
  }

  const originHeader = request.headers.get("origin");
  if (!originHeader || originHeader === "null") {
    return { ok: false, reason: "MISSING_ORIGIN" };
  }

  const origin = normalizeOrigin(originHeader);
  if (!origin) return { ok: false, reason: "INVALID_ORIGIN" };

  const trustedOrigins = getTrustedOrigins(request);
  if (!trustedOrigins.has(origin)) {
    return { ok: false, reason: "UNTRUSTED_ORIGIN" };
  }

  return { ok: true };
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(({ name }) => SUPABASE_AUTH_COOKIE.test(name));
}

function getTrustedOrigins(request: NextRequest) {
  const trusted = new Set<string>();
  const configured = [
    process.env.APP_ORIGIN,
    process.env.CSRF_TRUSTED_ORIGINS,
  ];

  for (const value of configured) {
    for (const candidate of value?.split(",") ?? []) {
      const origin = normalizeOrigin(candidate.trim());
      if (origin) trusted.add(origin);
    }
  }

  // Local and test servers frequently use random ports. Production must use
  // an explicit allowlist so an attacker-controlled Host cannot become trusted.
  if (process.env.NODE_ENV !== "production") {
    trusted.add(request.nextUrl.origin);
  }

  return trusted;
}

function normalizeOrigin(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function withoutTrailingSlash(pathname: string) {
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}
