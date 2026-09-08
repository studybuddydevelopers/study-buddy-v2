import { createPageMetadata } from "@/lib/site-metadata";
import SettingsClient from "./SettingsClient";

export const metadata = createPageMetadata({
  title: "Settings",
  description:
    "Manage your Study Buddy account preferences, low-data mode, cloud draft syncing and other learning settings.",
  index: false,
});

export default function SettingsPage() {
  return <SettingsClient />;
}
