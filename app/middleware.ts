import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// All pages that REQUIRE the user to be logged in
const protectedPaths = [
  "/dashboard",
  "/materials",
  "/exams",
  "/progress",
  "/chat",
  "/profile",
  "/account",
];

// Pages where logged-in users SHOULD NOT be allowed
// (they should be redirected to dashboard)
const authPages = ["/login", "/sign-up"];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Create a Supabase client that reads/writes cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll(); // read cookies from request
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options); // write updated cookies
          });
        },
      },
    }
  );

  // Get authenticated user (safe for middleware)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // 1️⃣ PROTECTED ROUTES — must be logged in
  const isProtected = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 2️⃣ AUTH PAGES — logged-in users should be redirected away
  const isAuthPage = authPages.some((path) =>
    pathname.startsWith(path)
  );

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

// Match ALL pages except static assets & Next.js internals
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo-icon.svg).*)",
  ],
};
