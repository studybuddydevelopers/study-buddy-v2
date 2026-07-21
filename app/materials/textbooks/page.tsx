import { getMaterialsOverview } from "../materials-data";
import TextbooksClient from "./TextbooksClient";

export default async function TextbooksPage() {
  const subjects = await getMaterialsOverview();
  return <TextbooksClient subjects={subjects} />;
}
