import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { fetchWithTimeout } from "@/lib/security/timeouts";
import { authRedirectUrl } from "@/lib/supabase/auth-redirect";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  if (!tokenHash || type !== "email") {
    return confirmationErrorResponse(requestUrl, "invalid");
  }

  const response = NextResponse.redirect(
    authRedirectUrl("/verify-email?status=confirmed", request.url)
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
      // verifyOtp returns a session, but email confirmation should finish on a
      // clear success screen and require an explicit password login. Do not
      // persist the verification session in this browser.
      setAll() {},
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
  const redirectUrl = new URL(
    authRedirectUrl("/verify-email", requestUrl.toString())
  );
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
