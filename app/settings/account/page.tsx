import { createPageMetadata } from "@/lib/site-metadata";
import AccountSettingsClient from "./AccountSettingsClient";

export const metadata = createPageMetadata({
  title: "Account Management",
  description:
    "Deactivate a Study Buddy account or request permanent account deletion.",
  index: false,
});

export default function AccountSettingsPage() {
  return <AccountSettingsClient />;
}

