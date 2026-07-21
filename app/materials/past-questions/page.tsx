import { getMaterialsOverview } from "../materials-data";
import PastQuestionsClient from "./PastQuestionsClient";

export default async function PastQuestionsPage() {
  const subjects = await getMaterialsOverview();
  return <PastQuestionsClient subjects={subjects} />;
}
