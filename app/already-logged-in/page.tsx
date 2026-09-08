// app/already-logged-in/page.tsx

import { createPageMetadata } from "@/lib/site-metadata";
import AlreadyLoggedInClient from "./AlreadyLoggedInClient";

export const metadata = createPageMetadata({
  title: "Already Logged In",
  description:
    "You are already signed in to Study Buddy; return to your dashboard to continue learning or switch accounts safely.",
  index: false,
});

export default async function AlreadyLoggedInPage() {
  // Optional SSR delay like your example
  await new Promise((r) => setTimeout(r, 500));

  return <AlreadyLoggedInClient />;
}
