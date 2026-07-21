import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/getBaseUrl";
import type { MaterialsSubjectSection } from "./materials.types";

export async function getMaterialsOverview() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/materials/overview`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });

  const data: { subjects: MaterialsSubjectSection[] } = res.ok
    ? await res.json()
    : { subjects: [] };

  return data.subjects ?? [];
}
