import { createPageMetadata } from "@/lib/site-metadata";
import SettingsClient from "./SettingsClient";

export const metadata = createPageMetadata({
  title: "Settings",
  description:
    "Manage your Study Buddy profile, study preferences, security, privacy and account controls.",
  index: false,
});

export default function SettingsPage() {
  return <SettingsClient />;
}
