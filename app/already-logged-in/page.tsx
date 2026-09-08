// app/already-logged-in/page.tsx

import type { Metadata } from "next";
import AlreadyLoggedInClient from "./AlreadyLoggedInClient";

export const metadata: Metadata = {
  title: "Already Logged In | Study Buddy",
  description:
    "You are already signed in to Study Buddy and can return to your learning dashboard.",
};

export default async function AlreadyLoggedInPage() {
  // Optional SSR delay like your example
  await new Promise((r) => setTimeout(r, 500));

  return <AlreadyLoggedInClient />;
}
