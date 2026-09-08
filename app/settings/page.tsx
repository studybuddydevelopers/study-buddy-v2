import type { Metadata } from "next";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings | Study Buddy",
  description:
    "Manage your Study Buddy account preferences and learning settings.",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
