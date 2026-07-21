import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

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
  "/auth/password-reset",
];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value ?? null;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (protectedPaths.some((p) => pathname.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (guestOnlyPaths.some((p) => pathname.startsWith(p)) && user) {
    return NextResponse.redirect(new URL("/already-logged-in", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|logo-icon.svg).*)",
  ],
};
