import type { Metadata } from "next";
import { getMaterialsOverview } from "../materials-data";
import PastQuestionsClient from "./PastQuestionsClient";

export const metadata: Metadata = {
  title: "Past Questions | Study Buddy",
  description:
    "Practise WAEC-style past questions by subject and strengthen the topics that need more work.",
};

export default async function PastQuestionsPage() {
  const subjects = await getMaterialsOverview();
  return <PastQuestionsClient subjects={subjects} />;
}
