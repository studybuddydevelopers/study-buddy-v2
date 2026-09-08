// app/reset-password/update/page.tsx

import type { Metadata } from "next";
import ResetPasswordUpdateClient from "./ResetPasswordUpdateClient";

export const metadata: Metadata = {
  title: "Choose a New Password | Study Buddy",
  description:
    "Choose a new password to finish recovering your Study Buddy account.",
};

export default function Page() {
  return <ResetPasswordUpdateClient />;
}
