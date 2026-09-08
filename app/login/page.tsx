// app/login/page.tsx (SERVER COMPONENT)

import { createPageMetadata } from "@/lib/site-metadata";
import LoginClient from "./LoginClient";

export const metadata = createPageMetadata({
  title: "Log In",
  description:
    "Sign in to continue your personalised study plan, practise questions, review progress and use the Study Buddy learning tools linked to your account.",
  index: false,
});

export default async function LoginPage() {
  // Simulate SSR delay
  await new Promise((r) => setTimeout(r, 800));

  return <LoginClient />;
}
