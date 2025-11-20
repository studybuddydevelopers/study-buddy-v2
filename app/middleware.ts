// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

  // Refresh session AND read the user
  const { data: { session }, error: sessionError } =
    await supabase.auth.getSession();

  // Sync refreshed cookies into the response
  const { data: { user }, error: userError } =
    await supabase.auth.getUser();

  const path = req.nextUrl.pathname;

  const protectedPaths = [
    "/dashboard",
    "/materials",
    "/exams",
    "/progress",
    "/chat",
    "/profile",
    "/account",
  ];

  const authPages = ["/login", "/sign-up"];

  if (protectedPaths.some((x) => path.startsWith(x)) && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (authPages.some((x) => path.startsWith(x)) && user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
