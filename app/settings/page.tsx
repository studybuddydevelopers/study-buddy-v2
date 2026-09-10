import { createPageMetadata } from "@/lib/site-metadata";
import SettingsClient from "./SettingsClient";

export const metadata = createPageMetadata({
  title: "Settings",
  description:
    "Open Study Buddy study preferences and account-management settings.",
  index: false,
});

export default function SettingsPage() {
  return <SettingsClient />;
}
