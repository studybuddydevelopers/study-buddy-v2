import type { Metadata } from "next";
import ClientLayoutWrapper from "./ClientLayoutWrapper";
import "./globals.css";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const metadata: Metadata = {
  title: "Study Buddy",
  description: "The no 1 platform to get high grades at WAEC exams",
  icons: ["logo-icon.svg"],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // Fetch logged-in user (SSR)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        {/* Pass SSR user ONLY once */}
        <main className="p-6 flex justify-between flex-col min-h-svh">
          <ClientLayoutWrapper user={user}>
            {children}
          </ClientLayoutWrapper>
        </main>
      </body>
    </html>
  );
}
