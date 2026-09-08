// app/unauthorized/page.tsx

import { createPageMetadata } from "@/lib/site-metadata";
import UnauthorizedClient from "./UnauthorizedClient";

export const metadata = createPageMetadata({
  title: "Access Denied",
  description:
    "This Study Buddy page requires an authorised account; sign in securely or return to the homepage.",
  index: false,
});

export default async function UnauthorizedPage() {
  // Optional SSR loading delay to match your style
  await new Promise((r) => setTimeout(r, 1000));

  return <UnauthorizedClient />;
}
