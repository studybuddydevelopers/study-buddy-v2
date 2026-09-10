import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { fetchWithTimeout } from "@/lib/security/timeouts";

const SUPABASE_AUTH_COOKIE = /^sb-[A-Za-z0-9_-]+-auth-token(?:\.\d+)?$/;

export async function signedOutJsonResponse(
  request: Request,
  body: Record<string, unknown>,
  status = 200
) {
  const response = NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  const config = getServerSupabaseConfig();
  const incomingCookies = parseCookieHeader(request.headers.get("cookie"));
  const supabase = createServerClient(config.url, config.key, {
    global: { fetch: fetchWithTimeout },
    cookies: {
      getAll() {
        return incomingCookies;
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, { ...options, path: "/" });
        }
      },
    },
  });

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Database account state is already restrictive. Explicit cookie expiry
    // below makes sign-out fail closed even during an Auth provider outage.
  }

  for (const { name } of incomingCookies) {
    if (SUPABASE_AUTH_COOKIE.test(name)) {
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  return response;
}

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(";")
    .map((cookie) => {
      const [name, ...valueParts] = cookie.trim().split("=");
      return { name, value: valueParts.join("=") };
    })
    .filter((cookie) => cookie.name);
}

