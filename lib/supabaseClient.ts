// lib/supabaseClient.ts
import { createBrowserClient } from "@supabase/ssr";
import { getBrowserSupabaseConfig } from "@/lib/supabase/config";

const supabaseConfig = getBrowserSupabaseConfig();

export const supabase = createBrowserClient(supabaseConfig.url, supabaseConfig.key);
