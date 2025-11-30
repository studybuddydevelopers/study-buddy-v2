import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const protectedPaths = [
  "/dashboard",
  "/materials",
  "/exams",
  "/progress",
  "/chat",
  "/profile",
  "/account",
];

const guestOnlyPaths = [
  "/login",
  "/sign-up",
  "/forgot-password",
  "/check-email",
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });
  const pathname = req.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, opts) => res.cookies.set(name, value, opts),
        remove: (name, opts) => res.cookies.set(name, "", { ...opts, maxAge: 0 }),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

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

