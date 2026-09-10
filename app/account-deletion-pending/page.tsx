import AccountLifecycleStatus from "@/components/AccountLifecycleStatus";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Account Deletion Pending",
  description: "Review or cancel a pending Study Buddy account deletion.",
  index: false,
});

export default function AccountDeletionPendingPage() {
  return <AccountLifecycleStatus mode="deletion-pending" />;
}

