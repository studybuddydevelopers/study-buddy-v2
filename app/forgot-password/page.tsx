// app/forgot-password/page.tsx

import type { Metadata } from "next";
import ForgotPasswordClient from "./ForgotPasswordClient";

export const metadata: Metadata = {
  title: "Reset Your Password | Study Buddy",
  description:
    "Request a secure Study Buddy password-reset link and regain access to your account.",
};

export default async function ForgotPasswordPage() {
  // Optional: simulate SSR delay
  await new Promise((r) => setTimeout(r, 500));

  return <ForgotPasswordClient />;
}
