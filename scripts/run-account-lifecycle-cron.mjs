class CronRunError extends Error {
  constructor(reason, status) {
    super(reason);
    this.name = "CronRunError";
    this.reason = reason;
    this.status = status;
  }
}

function lifecycleEndpoint() {
  const appOrigin = process.env.APP_ORIGIN?.trim();
  const cronSecret = process.env.ACCOUNT_DELETION_CRON_SECRET?.trim();

  if (!appOrigin) throw new CronRunError("APP_ORIGIN_MISSING");
  if (!cronSecret || cronSecret.length < 32) {
    throw new CronRunError("ACCOUNT_DELETION_CRON_SECRET_INVALID");
  }

  let origin;
  try {
    origin = new URL(appOrigin);
  } catch {
    throw new CronRunError("APP_ORIGIN_INVALID");
  }

  const isLocal =
    origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
  if (origin.protocol !== "https:" && !(isLocal && origin.protocol === "http:")) {
    throw new CronRunError("APP_ORIGIN_MUST_USE_HTTPS");
  }
  if (origin.username || origin.password || origin.search || origin.hash) {
    throw new CronRunError("APP_ORIGIN_INVALID");
  }

  return {
    cronSecret,
    endpoint: new URL("/api/v1/account/deletion/cron", origin),
  };
}

async function main() {
  const { cronSecret, endpoint } = lifecycleEndpoint();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "x-cron-secret": cronSecret,
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(300_000),
  });

  if (!response.ok) {
    throw new CronRunError("NON_SUCCESS_RESPONSE", response.status);
  }

  console.info(
    JSON.stringify({
      event: "account_lifecycle_cron_invocation_completed",
      status: response.status,
    })
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      event: "account_lifecycle_cron_invocation_failed",
      reason: error instanceof CronRunError ? error.reason : error?.name,
      ...(error instanceof CronRunError && error.status
        ? { status: error.status }
        : {}),
    })
  );
  process.exitCode = 1;
});
