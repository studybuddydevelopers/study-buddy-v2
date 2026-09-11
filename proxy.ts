import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { fetchWithTimeout } from "@/lib/security/timeouts";
import { validateCookieMutationOrigin } from "@/lib/security/csrf";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { accountStatusDestination } from "@/lib/account-status";
import { authRedirectUrl } from "@/lib/supabase/auth-redirect";

const protectedPaths = [
  "/dashboard",
  "/materials",
  "/exams",
  "/progress",
  "/chat",
  "/profile",
  "/settings",
  "/account",
  "/account-deactivated",
  "/account-deletion-pending",
];

const guestOnlyPaths = [
  "/login",
  "/sign-up",
  "/forgot-password",
  "/check-email",
  "/auth/password-reset",
  "/reset-password",
];

const productionDisabledPaths = [
  "/icon-audit",
  "/temp-logo-preview",
  "/new-logo-preview",
  "/cube-usage-audit",
  "/demo-showcase",
  "/api/v1/whatsapp/webhook",
];

const HEALTH_CHECK_PATH = "/api/health";
const MAX_API_BODY_BYTES = 30 * 1024 * 1024;

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);

  if (
    process.env.NODE_ENV === "production" &&
    productionDisabledPaths.some((path) => pathMatches(pathname, path))
  ) {
    return withContentSecurityPolicy(
      new NextResponse("Not Found", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      }),
      contentSecurityPolicy
    );
  }

  const csrfValidation = validateCookieMutationOrigin(req);
  if (!csrfValidation.ok) {
    logSecurityEvent("csrf_validation_failed", "warn", {
      reason: csrfValidation.reason,
      method: req.method,
      path: pathname,
    });
    return withContentSecurityPolicy(
      NextResponse.json(
        {
          error: "CSRF_VALIDATION_FAILED",
          message: "The request origin could not be verified.",
        },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      ),
      contentSecurityPolicy
    );
  }

  if (pathname.startsWith("/api/") && requestBodyIsTooLarge(req)) {
    return withContentSecurityPolicy(
      NextResponse.json(
        {
          error: "REQUEST_TOO_LARGE",
          message: "Request body must be 30 MB or smaller.",
        },
        { status: 413, headers: { "Cache-Control": "no-store" } }
      ),
      contentSecurityPolicy
    );
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const res = withContentSecurityPolicy(
    NextResponse.next({ request: { headers: requestHeaders } }),
    contentSecurityPolicy
  );

  // Railway only needs process liveness here. Avoid making deployment health
  // depend on an external Supabase Auth request.
  if (pathname === HEALTH_CHECK_PATH) return res;

  const supabaseConfig = getServerSupabaseConfig();

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.key,
    {
      global: { fetch: fetchWithTimeout },
      cookies: {
        getAll() {
          return req.cookies.getAll().map(({ name, value }) => ({
            name,
            value,
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const accountStatus =
    typeof user?.user_metadata?.accountStatus === "string"
      ? user.user_metadata.accountStatus
      : null;

  if (protectedPaths.some((path) => pathMatches(pathname, path)) && !user) {
    return withContentSecurityPolicy(
      NextResponse.redirect(authRedirectUrl("/unauthorized", req.url)),
      contentSecurityPolicy
    );
  }

  if (user && protectedPaths.some((path) => pathMatches(pathname, path))) {
    const restrictedDestination = accountStatusDestination(accountStatus);
    if (restrictedDestination && restrictedDestination !== pathname) {
      return withContentSecurityPolicy(
        NextResponse.redirect(authRedirectUrl(restrictedDestination, req.url)),
        contentSecurityPolicy
      );
    }
  }

  if (guestOnlyPaths.some((path) => pathMatches(pathname, path)) && user) {
    const destination =
      accountStatusDestination(accountStatus) ?? "/already-logged-in";
    return withContentSecurityPolicy(
      NextResponse.redirect(authRedirectUrl(destination, req.url)),
      contentSecurityPolicy
    );
  }

  return res;
}

function pathMatches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function buildContentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const styleSource = isDevelopment
    ? "style-src 'self' 'unsafe-inline' https://*.hcaptcha.com"
    : `style-src 'self' 'nonce-${nonce}' https://*.hcaptcha.com`;

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://*.hcaptcha.com`,
    "script-src-attr 'none'",
    styleSource,
    // React still renders a small number of dynamic style attributes. Keep the
    // exception scoped to attributes instead of allowing arbitrary <style>
    // blocks. Remove this after those attributes have moved to CSS classes.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com https://*.hcaptcha.com",
    "frame-src https://challenges.cloudflare.com https://*.hcaptcha.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!isDevelopment ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function withContentSecurityPolicy(
  response: NextResponse,
  contentSecurityPolicy: string
) {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

function requestBodyIsTooLarge(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return false;

  const rawLength = req.headers.get("content-length");
  if (!rawLength) return false;

  const length = Number.parseInt(rawLength, 10);
  return Number.isFinite(length) && length > MAX_API_BODY_BYTES;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|logo-icon.svg).*)",
  ],
};
