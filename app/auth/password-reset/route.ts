// app/auth/password-reset/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const token = url.searchParams.get("token");
  const type = url.searchParams.get("type");
  const email = url.searchParams.get("email");

  if (!token || type !== "recovery") {
    return NextResponse.redirect(new URL("/forgot-password", url.origin));
  }

  if (!email) {
    return NextResponse.redirect(new URL("/forgot-password", url.origin));
  }

  const redirectUrl = new URL("/reset-password/update", url.origin);
  redirectUrl.searchParams.set("token", token);
  redirectUrl.searchParams.set("email", email);

  return NextResponse.redirect(redirectUrl);
}
