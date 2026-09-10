import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { fetchWithTimeout } from "@/lib/security/timeouts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  if (!tokenHash || type !== "email") {
    return confirmationErrorResponse(requestUrl, "invalid");
  }

  const response = NextResponse.redirect(
    new URL("/dashboard?email_confirmed=true", requestUrl.origin)
  );
  response.headers.set("Cache-Control", "no-store");

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
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });
    if (!error) return response;

    return confirmationErrorResponse(
      requestUrl,
      error.code === "otp_expired" ? "expired" : "invalid"
    );
  } catch {
    return confirmationErrorResponse(requestUrl, "invalid");
  }
}

function confirmationErrorResponse(
  requestUrl: URL,
  status: "expired" | "invalid"
) {
  const redirectUrl = new URL("/verify-email", requestUrl.origin);
  redirectUrl.searchParams.set("status", status);
  return NextResponse.redirect(redirectUrl, {
    headers: { "Cache-Control": "no-store" },
  });
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
