import { createPageMetadata } from "@/lib/site-metadata";
import GuardianDecisionClient from "./GuardianDecisionClient";

export const metadata = createPageMetadata({
  title: "Guardian Authorisation",
  description: "Review a Study Buddy child-account authorisation request.",
  index: false,
});

export default function GuardianAuthorizationPage() {
  return <GuardianDecisionClient />;
}
