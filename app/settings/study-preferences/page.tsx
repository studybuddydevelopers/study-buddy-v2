import { createPageMetadata } from "@/lib/site-metadata";
import StudyPreferencesClient from "./StudyPreferencesClient";

export const metadata = createPageMetadata({
  title: "Study Preferences",
  description:
    "Manage Study Buddy draft syncing, image loading, and low-data preferences.",
  index: false,
});

export default async function StudyPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const from = (await searchParams).from;
  const cameFromProfile = from === "profile";

  return (
    <StudyPreferencesClient
      backHref={cameFromProfile ? "/profile" : "/settings"}
      backLabel={cameFromProfile ? "Back to profile" : "Back to settings"}
    />
  );
}
