import AccountDeletionConfirmationClient from "./AccountDeletionConfirmationClient";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Confirm Account Deletion",
  description: "Confirm a Study Buddy permanent account-deletion request.",
  index: false,
});

export default function AccountDeletionConfirmationPage() {
  return <AccountDeletionConfirmationClient />;
}

