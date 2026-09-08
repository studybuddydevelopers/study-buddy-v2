import { createPageMetadata } from "@/lib/site-metadata";
import { getMaterialsOverview } from "../materials-data";
import FlashcardsClient from "./FlashcardsClient";

export const metadata = createPageMetadata({
  title: "Flashcards",
  description:
    "Choose a subject and revise key WAEC concepts with Study Buddy flashcard collections designed for quick recall practice.",
  index: false,
});

export default async function FlashcardsPage() {
  const subjects = await getMaterialsOverview();
  return <FlashcardsClient subjects={subjects} />;
}
