import { createPageMetadata } from "@/lib/site-metadata";
import StudyPreferencesClient from "./StudyPreferencesClient";

export const metadata = createPageMetadata({
  title: "Study Preferences",
  description:
    "Manage Study Buddy draft syncing, image loading, and low-data preferences.",
  index: false,
});

export default function StudyPreferencesPage() {
  return <StudyPreferencesClient />;
}

