// lib/getBaseUrl.ts
import { headers } from "next/headers";
import { trustedAppOrigin } from "@/lib/supabase/auth-redirect";

// Production self-fetches carry the user's session cookies, so their target
// must come from the validated canonical origin rather than the incoming Host
// header (which may be Railway's internal host or attacker-controlled).
export async function getBaseUrl(): Promise<string> {
  if (process.env.NODE_ENV === "production") {
    return trustedAppOrigin();
  }

  // Preserve whichever host/port is actually running the local or test server.
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const forwardedProtocol = headersList.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "https" ? "https" : "http";
  return new URL(`${protocol}://${host}`).origin;
}
