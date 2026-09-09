import { createPageMetadata } from "@/lib/site-metadata";
import GuardianPendingClient from "./GuardianPendingClient";

export const metadata = createPageMetadata({
  title: "Guardian Approval Pending",
  description: "A parent or legal guardian must approve this Study Buddy account.",
  index: false,
});

export default function GuardianAuthorizationPendingPage() {
  return <GuardianPendingClient />;
}
