// app/verify-email/page.tsx
import { createPageMetadata } from "@/lib/site-metadata";
import ClientEmailVerify from "./ClientEmailVerify";

export const metadata = createPageMetadata({
  title: "Verify Your Email",
  description:
    "Confirm your email address to finish setting up and securing your Study Buddy learner account.",
  index: false,
});

export default async function VerifyEmailPage() {
  // simulate server-side loading
  await new Promise((r) => setTimeout(r, 1000));

  return <ClientEmailVerify />;
}
