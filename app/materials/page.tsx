import { createPageMetadata } from "@/lib/site-metadata";
import MaterialsClient from "./MaterialsClient";
import { getMaterialsOverview } from "./materials-data";

export const metadata = createPageMetadata({
  title: "Study Materials",
  description:
    "Browse your Study Buddy learning materials by subject, including past questions, topic practice, flashcard collections and textbooks.",
  index: false,
});

export default async function MaterialsPage() {
  const subjects = await getMaterialsOverview();
  return <MaterialsClient subjects={subjects} />;
}
