// app/auth/password-reset/route.ts
import { NextResponse } from "next/server";
import { authRedirectUrl } from "@/lib/supabase/auth-redirect";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const code = url.searchParams.get("code");
  const token = url.searchParams.get("token");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const email = url.searchParams.get("email");
  const error = url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");
  const errorDescription = url.searchParams.get("error_description");

  // Railway may expose its internal localhost origin in req.url. Browser-facing
  // redirects must always use the explicitly trusted application origin.
  const redirectUrl = new URL(
    authRedirectUrl("/reset-password/update", req.url)
  );

  if (error) {
    redirectUrl.searchParams.set("error", error);
    if (errorCode) redirectUrl.searchParams.set("error_code", errorCode);
    if (errorDescription) {
      redirectUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    redirectUrl.searchParams.set("code", code);
    return NextResponse.redirect(redirectUrl);
  }

  if (tokenHash && type === "recovery") {
    redirectUrl.searchParams.set("token_hash", tokenHash);
    redirectUrl.searchParams.set("type", type);
    return NextResponse.redirect(redirectUrl);
  }

  if (token && type === "recovery" && email) {
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("email", email);
    redirectUrl.searchParams.set("type", type);
    return NextResponse.redirect(redirectUrl);
  }

  if (token || tokenHash || type || email) {
    return NextResponse.redirect(
      authRedirectUrl("/forgot-password", req.url)
    );
  }

  return NextResponse.redirect(authRedirectUrl("/forgot-password", req.url));
}
