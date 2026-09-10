import { signedOutJsonResponse } from "@/lib/supabase/sign-out-response";

export async function POST(req: Request) {
  return signedOutJsonResponse(req, { ok: true });
}
