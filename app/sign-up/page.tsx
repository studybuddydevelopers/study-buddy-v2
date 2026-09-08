// app/sign-up/page.tsx (SERVER COMPONENT)

import { createPageMetadata } from "@/lib/site-metadata";
import SignUpClient from "./SignUpClient";

export const metadata = createPageMetadata({
  title: "Create an Account",
  description:
    "Create a Study Buddy learner account to set your WAEC goals, access personalised revision tools and keep your study progress in one place.",
  index: false,
});

export default function SignUpPage() {
  return <SignUpClient />;
}
