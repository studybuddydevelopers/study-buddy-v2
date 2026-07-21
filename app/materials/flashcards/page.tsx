import { getMaterialsOverview } from "../materials-data";
import FlashcardsClient from "./FlashcardsClient";

export default async function FlashcardsPage() {
  const subjects = await getMaterialsOverview();
  return <FlashcardsClient subjects={subjects} />;
}
