// app/reset-password/update/page.tsx

import { createPageMetadata } from "@/lib/site-metadata";
import ResetPasswordUpdateClient from "./ResetPasswordUpdateClient";

export const metadata = createPageMetadata({
  title: "Choose a New Password",
  description:
    "Choose and confirm a new password to complete the secure recovery of your Study Buddy account.",
  index: false,
});

export default function Page() {
  return <ResetPasswordUpdateClient />;
}
