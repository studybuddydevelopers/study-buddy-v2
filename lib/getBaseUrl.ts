// lib/getBaseUrl.ts
import { headers } from "next/headers";

// Derives the origin of the current request instead of relying on a static
// env var, so server-side self-fetches (e.g. dashboard -> /api/v1/me) hit
// whatever host/port is actually serving the request in any environment.
export async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host")!;
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}
