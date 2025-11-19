import type { Metadata } from "next";
import ClientLayoutWrapper from "./ClientLayoutWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Buddy",
  description: "The no 1 platform to get high grades at WAEC exams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body>
        <div id="root">
          <div>
            <main className="p-6 flex justify-between flex-col min-h-svh">
              <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
