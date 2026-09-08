import type { Metadata } from "next";
import { getMaterialsOverview } from "../materials-data";
import FlashcardsClient from "./FlashcardsClient";

export const metadata: Metadata = {
  title: "Flashcards | Study Buddy",
  description:
    "Revise key WAEC concepts with Study Buddy flashcards organised by subject and collection.",
};

export default async function FlashcardsPage() {
  const subjects = await getMaterialsOverview();
  return <FlashcardsClient subjects={subjects} />;
}
