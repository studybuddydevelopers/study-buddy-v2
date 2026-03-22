// lib/auth.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        // no-ops for app routes (we only need to read cookies here)
        set() {},
        remove() {},
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    return {
      errorResponse: NextResponse.json(
        { error: "User record not found" },
        { status: 403 }
      ),
    };
  }

  return { user, dbUser };
}

export async function requireAdmin() {
  const base = await requireUser();
  if ("errorResponse" in base) return base;

  const { user, dbUser } = base;

  const adminRecord = await prisma.adminUser.findUnique({
    where: { userId: dbUser.id },
  });

  const isAdmin = dbUser.isAdmin && !!adminRecord;

  if (!isAdmin) {
    return {
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user, dbUser };
}
