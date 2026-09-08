// app/sign-up/page.tsx (SERVER COMPONENT)

import type { Metadata } from "next";
import SignUpClient from "./SignUpClient";

export const metadata: Metadata = {
  title: "Create an Account | Study Buddy",
  description:
    "Create your Study Buddy account and start building a personalised path towards your WAEC goals.",
};

export default function SignUpPage() {
  return <SignUpClient />;
}
