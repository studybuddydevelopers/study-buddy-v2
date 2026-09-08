import { Suspense } from "react";
import ClientLayoutWrapper from "./ClientLayoutWrapper";
import "./globals.css";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Metadata } from "next";
import { LEGAL_ENTITY_NAME } from "@/lib/legal-entity";
import {
  createPageMetadata,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  getMetadataBase,
  SITE_NAME,
} from "@/lib/site-metadata";
import { getServerSupabaseConfig } from "@/lib/supabase/config";
import { fetchWithTimeout } from "@/lib/security/timeouts";

export const runtime = "nodejs"; // <-- required

export const metadata: Metadata = {
  ...createPageMetadata({
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
    path: "/",
    absoluteTitle: true,
  }),
  metadataBase: getMetadataBase(),
  title: {
    default: DEFAULT_SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  applicationName: SITE_NAME,
  authors: [{ name: LEGAL_ENTITY_NAME }],
  creator: LEGAL_ENTITY_NAME,
  publisher: LEGAL_ENTITY_NAME,
  category: "education",
  keywords: [
    "WAEC exam preparation",
    "WAEC practice questions",
    "Nigerian secondary school students",
    "personalised study plans",
    "AI study support",
  ],
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
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
        <div className="p-6 flex justify-between flex-col min-h-svh">

          {/* Provide the user instantly to the client wrapper */}
          <ClientLayoutWrapper isAuthenticated={!!user}>
            
            {/* 🔥 <Suspense> here makes loading.tsx appear */}
            <Suspense fallback={""}>
              {children}
            </Suspense>

          </ClientLayoutWrapper>

        </div>
      </body>
    </html>
  );
}
