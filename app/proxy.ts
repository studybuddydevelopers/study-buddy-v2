// proxy.ts
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

const guestOnlyPaths = ["/login", "/sign-up"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set(name, value, options);
        },
        remove(name, options) {
          res.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = req.nextUrl.pathname;

  // Not logged in → rewrite to unauthorized screen
  if (protectedPaths.some((p) => pathname.startsWith(p)) && !user) {
    return NextResponse.rewrite(new URL("/unauthorized", req.url));
  }

  // Already logged in → rewrite to already-logged-in screen
  if (guestOnlyPaths.some((p) => pathname.startsWith(p)) && user) {
    return NextResponse.rewrite(new URL("/already-logged-in", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
