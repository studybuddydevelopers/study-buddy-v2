import { createPageMetadata } from "@/lib/site-metadata";
import { getMaterialsOverview } from "../materials-data";
import TextbooksClient from "./TextbooksClient";

export const metadata = createPageMetadata({
  title: "Textbooks",
  description:
    "Choose a WAEC subject and browse Study Buddy textbook collections for longer-form explanations and revision resources.",
  index: false,
});

export default async function TextbooksPage() {
  const subjects = await getMaterialsOverview();
  return <TextbooksClient subjects={subjects} />;
}
