const PRODUCTION_HOSTS = new Set([
  "studybuddyng.com",
  "www.studybuddyng.com",
]);

const APPROVED_CUSTOM_STAGING_HOSTS = new Set([
  "staging.studybuddyng.com",
]);

export function validateZapTarget(rawTarget) {
  const value = rawTarget?.trim();
  if (!value) {
    throw new Error("ZAP_TARGET_URL_MISSING");
  }

  let target;
  try {
    target = new URL(value);
  } catch {
    throw new Error("ZAP_TARGET_URL_INVALID");
  }

  const hostname = target.hostname.toLowerCase();
  if (target.protocol !== "https:") {
    throw new Error("ZAP_TARGET_HTTPS_REQUIRED");
  }
  if (target.username || target.password) {
    throw new Error("ZAP_TARGET_CREDENTIALS_FORBIDDEN");
  }
  if (target.port && target.port !== "443") {
    throw new Error("ZAP_TARGET_NONSTANDARD_PORT_FORBIDDEN");
  }
  if (target.pathname !== "/" || target.search || target.hash) {
    throw new Error("ZAP_TARGET_ORIGIN_ONLY");
  }
  if (PRODUCTION_HOSTS.has(hostname)) {
    throw new Error("ZAP_TARGET_PRODUCTION_FORBIDDEN");
  }

  const isRailwayStagingHost = hostname.endsWith(".up.railway.app");
  const isApprovedCustomStagingHost = APPROVED_CUSTOM_STAGING_HOSTS.has(hostname);
  if (!isRailwayStagingHost && !isApprovedCustomStagingHost) {
    throw new Error("ZAP_TARGET_NOT_APPROVED_STAGING_HOST");
  }

  return target.origin;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const target = validateZapTarget(process.argv[2]);
    console.log(`Approved staging ZAP target: ${target}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "ZAP_TARGET_INVALID");
    process.exitCode = 1;
  }
}
