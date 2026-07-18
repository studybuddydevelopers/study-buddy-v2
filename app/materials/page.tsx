import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/getBaseUrl";
import MaterialsClient, {
  MaterialsSubjectSection,
} from "./MaterialsClient";

export default async function MaterialsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const baseUrl = await getBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/v1/materials/overview`,
    {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  const data: { subjects: MaterialsSubjectSection[] } = res.ok
    ? await res.json()
    : { subjects: [] };

  return <MaterialsClient subjects={data.subjects ?? []} />;
}
