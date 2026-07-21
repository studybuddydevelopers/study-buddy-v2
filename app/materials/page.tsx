import MaterialsClient from "./MaterialsClient";
import { getMaterialsOverview } from "./materials-data";

export default async function MaterialsPage() {
  const subjects = await getMaterialsOverview();
  return <MaterialsClient subjects={subjects} />;
}
