// lib/auth.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import { getServerSupabaseConfig } from "@/lib/supabase/config";

export async function requireUser() {
  const cookieStore = await cookies();
  const supabaseConfig = getServerSupabaseConfig();

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map(({ name, value }) => ({
            name,
            value,
          }));
        },
        // no-op for app routes that only need to read the current user
        setAll() {},
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
