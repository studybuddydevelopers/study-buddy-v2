import AccountLifecycleStatus from "@/components/AccountLifecycleStatus";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Account Deactivated",
  description: "Reactivate a paused Study Buddy account.",
  index: false,
});

export default function AccountDeactivatedPage() {
  return <AccountLifecycleStatus mode="deactivated" />;
}

