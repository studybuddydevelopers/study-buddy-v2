// app/unauthorized/page.tsx

import type { Metadata } from "next";
import UnauthorizedClient from "./UnauthorizedClient";

export const metadata: Metadata = {
  title: "Access Denied | Study Buddy",
  description:
    "Sign in with an authorised Study Buddy account to access this page.",
};

export default async function UnauthorizedPage() {
  // Optional SSR loading delay to match your style
  await new Promise((r) => setTimeout(r, 1000));

  return <UnauthorizedClient />;
}
