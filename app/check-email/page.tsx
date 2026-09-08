// app/reset-password/update/page.tsx

import { createPageMetadata } from "@/lib/site-metadata";
import CheckEmailClient from "./CheckEmailClient";

export const metadata = createPageMetadata({
  title: "Check Your Email",
  description:
    "Check your inbox and follow the secure email link to continue setting up or recovering your Study Buddy account.",
  index: false,
});

export default function Page() {
  return <CheckEmailClient />;
}
