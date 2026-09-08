// app/reset-password/update/page.tsx

import type { Metadata } from "next";
import CheckEmailClient from "./CheckEmailClient";

export const metadata: Metadata = {
  title: "Check Your Email | Study Buddy",
  description:
    "Check your inbox for the email needed to continue your Study Buddy account action.",
};

export default function Page() {
  return <CheckEmailClient />;
}
