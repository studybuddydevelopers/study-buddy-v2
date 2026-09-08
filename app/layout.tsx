import { Suspense } from "react";
import ClientLayoutWrapper from "./ClientLayoutWrapper";
import "./globals.css";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Metadata } from "next";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { fetchWithTimeout } from "@/lib/security/timeouts";

export const runtime = "nodejs"; // <-- required

export const metadata: Metadata = {
  title: "Study Buddy",
  description: "The no 1 platform to get high grades at WAEC exams",
  icons: ["/logo-icon.svg"],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
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
        }
      }
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <main className="p-6 flex justify-between flex-col min-h-svh">

          {/* Provide the user instantly to the client wrapper */}
          <ClientLayoutWrapper isAuthenticated={!!user}>
            
            {/* 🔥 <Suspense> here makes loading.tsx appear */}
            <Suspense fallback={""}>
              {children}
            </Suspense>

          </ClientLayoutWrapper>

        </main>
      </body>
    </html>
  );
}
