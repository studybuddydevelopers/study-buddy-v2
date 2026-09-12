import { createPageMetadata } from "@/lib/site-metadata";
import MaterialsClient from "./MaterialsClient";
import { getMaterialsOverview } from "./materials-data";

export const metadata = createPageMetadata({
  title: "Study Materials",
  description:
    "Browse Study Buddy practice questions and flashcards by subject, with additional learning resources coming later.",
  index: false,
});

export default async function MaterialsPage() {
  const subjects = await getMaterialsOverview();
  return <MaterialsClient subjects={subjects} />;
}
