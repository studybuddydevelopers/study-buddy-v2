import type { Metadata } from "next";
import MaterialsClient from "./MaterialsClient";
import { getMaterialsOverview } from "./materials-data";

export const metadata: Metadata = {
  title: "Study Materials | Study Buddy",
  description:
    "Browse Study Buddy flashcards, past questions, practice activities, and textbooks by subject.",
};

export default async function MaterialsPage() {
  const subjects = await getMaterialsOverview();
  return <MaterialsClient subjects={subjects} />;
}
