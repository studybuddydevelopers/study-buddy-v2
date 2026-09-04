import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { fetchWithTimeout } from "@/lib/security/timeouts";

const protectedPaths = [
  "/dashboard",
  "/materials",
  "/exams",
  "/progress",
  "/chat",
  "/profile",
  "/settings",
  "/account",
];

const guestOnlyPaths = [
  "/login",
  "/sign-up",
  "/forgot-password",
  "/check-email",
];

const developmentOnlyPaths = [
  "/icon-audit",
  "/temp-logo-preview",
  "/new-logo-preview",
  "/cube-usage-audit",
  "/demo-showcase",
];

const MAX_API_BODY_BYTES = 30 * 1024 * 1024;

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (
    process.env.NODE_ENV === "production" &&
    developmentOnlyPaths.some((path) => pathMatches(pathname, path))
  ) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (pathname.startsWith("/api/") && requestBodyIsTooLarge(req)) {
    return NextResponse.json(
      {
        error: "REQUEST_TOO_LARGE",
        message: "Request body must be 30 MB or smaller.",
      },
      { status: 413, headers: { "Cache-Control": "no-store" } }
    );
  }

  const res = NextResponse.next();
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

  if (protectedPaths.some((path) => pathMatches(pathname, path)) && !user) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (guestOnlyPaths.some((path) => pathMatches(pathname, path)) && user) {
    return NextResponse.redirect(new URL("/already-logged-in", req.url));
  }

  return res;
}

function pathMatches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
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
