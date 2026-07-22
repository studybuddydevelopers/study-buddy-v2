// app/auth/password-reset/route.ts
import { NextResponse } from "next/server";

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

  const redirectUrl = new URL("/reset-password/update", url.origin);

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
    return NextResponse.redirect(new URL("/forgot-password", url.origin));
  }

  return NextResponse.redirect(new URL("/forgot-password", url.origin));
}
