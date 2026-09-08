// app/login/page.tsx (SERVER COMPONENT)

import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Log In | Study Buddy",
  description:
    "Log in to Study Buddy to continue your study plan, practise questions, and review your learning progress.",
};

export default async function LoginPage() {
  // Simulate SSR delay
  await new Promise((r) => setTimeout(r, 800));

  return <LoginClient />;
}
