// app/verify-email/page.tsx
import type { Metadata } from "next";
import ClientEmailVerify from "./ClientEmailVerify";

export const metadata: Metadata = {
  title: "Verify Your Email | Study Buddy",
  description:
    "Verify your email address to finish setting up and securing your Study Buddy account.",
};

export default async function VerifyEmailPage() {
  // simulate server-side loading
  await new Promise((r) => setTimeout(r, 1000));

  return <ClientEmailVerify />;
}
