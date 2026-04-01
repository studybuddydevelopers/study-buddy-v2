import { cookies } from "next/headers";
import MaterialsClient, {
  MaterialsSubjectSection,
} from "./MaterialsClient";

export default async function MaterialsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/materials/overview`,
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
