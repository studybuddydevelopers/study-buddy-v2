import { validateE2eDatabaseUrl } from "../../../scripts/prepare-e2e-database.mjs";

const { url } = validateE2eDatabaseUrl(process.env.E2E_DATABASE_URL);
if (
  process.env.STUDY_BUDDY_E2E_TEST_MODE !== "true" ||
  process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_SERVICE_ID || process.env.VERCEL ||
  !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.search || url.hash ||
  new URL(process.env.DATABASE_URL).href !== url.href ||
  new URL(process.env.DIRECT_URL).href !== url.href ||
  process.env.APP_ORIGIN !== "http://127.0.0.1:3200" ||
  process.env.SUPABASE_URL !== "http://127.0.0.1:55431" ||
  process.env.NEXT_PUBLIC_SUPABASE_URL !== process.env.SUPABASE_URL
) {
  throw new Error("The E2E provider fake requires the isolated local app, Auth and database.");
}

const realFetch = globalThis.fetch;
globalThis.fetch = function fetchE2eProvider(input, init) {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.href === "https://api.resend.com/emails" && !(input instanceof Request)) {
    return realFetch("http://127.0.0.1:55431/resend/emails", init);
  }
  if (url.origin === "https://api.paystack.co" &&
      url.pathname.startsWith("/transaction/verify/") && !(input instanceof Request)) {
    return realFetch(`http://127.0.0.1:55431/paystack${url.pathname}`, init);
  }
  if (url.origin === process.env.SUPABASE_URL || url.origin === process.env.APP_ORIGIN) {
    return realFetch(input, init);
  }
  throw new Error("Outbound fetch is disabled in the local E2E server.");
};
