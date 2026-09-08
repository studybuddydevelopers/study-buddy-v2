import { createPageMetadata } from "@/lib/site-metadata";
import { getMaterialsOverview } from "../materials-data";
import PastQuestionsClient from "./PastQuestionsClient";

export const metadata = createPageMetadata({
  title: "Past Questions",
  description:
    "Choose a subject, practise WAEC-style past questions and use your results to identify the topics that need more revision.",
  index: false,
});

export default async function PastQuestionsPage() {
  const subjects = await getMaterialsOverview();
  return <PastQuestionsClient subjects={subjects} />;
}
