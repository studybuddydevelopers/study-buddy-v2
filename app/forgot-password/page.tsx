// app/forgot-password/page.tsx

import { createPageMetadata } from "@/lib/site-metadata";
import ForgotPasswordClient from "./ForgotPasswordClient";

export const metadata = createPageMetadata({
  title: "Reset Your Password",
  description:
    "Request a secure password-reset link for your Study Buddy account and follow the email instructions to regain access.",
  index: false,
});

export default async function ForgotPasswordPage() {
  // Optional: simulate SSR delay
  await new Promise((r) => setTimeout(r, 500));

  return <ForgotPasswordClient />;
}
