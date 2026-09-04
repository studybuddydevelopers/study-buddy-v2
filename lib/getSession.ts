import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { fetchWithTimeout } from "@/lib/security/timeouts";

export async function getSession() {
  const cookieStore = await cookies();
  const supabaseConfig = getServerSupabaseConfig();

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.key,
    {
      global: { fetch: fetchWithTimeout },
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
