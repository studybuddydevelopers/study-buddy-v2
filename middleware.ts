import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

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
  "/verify-email",
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set(name, value, { ...options, path: "/" });
        },
        remove(name, options) {
          res.cookies.set(name, "", { ...options, maxAge: 0, path: "/" });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;

  // PROTECTED PAGES
  if (protectedPaths.some((p) => path.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  // GUEST ONLY PAGES
  if (guestOnlyPaths.some((p) => path.startsWith(p)) && user) {
    return NextResponse.redirect(new URL("/already-logged-in", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*|favicon.svg).*)"],
};
