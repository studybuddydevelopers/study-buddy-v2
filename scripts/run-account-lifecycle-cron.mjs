import { pathToFileURL } from "node:url";

class CronRunError extends Error {
  constructor(reason, status, causeCode) {
    super(reason);
    this.name = "CronRunError";
    this.reason = reason;
    this.status = status;
    this.causeCode = causeCode;
  }
}

const RAILWAY_PRIVATE_HOST_SUFFIX = ".railway.internal";
const TRANSPORT_RETRY_DELAYS_MS = [0, 1_000, 3_000, 7_000];
const RETRYABLE_TRANSPORT_CODES = new Set([
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

export function lifecycleEndpoint(env = process.env) {
  const appOrigin = env.APP_ORIGIN?.trim();
  const privateCronOrigin = env.ACCOUNT_LIFECYCLE_CRON_ORIGIN?.trim();
  const cronSecret = env.ACCOUNT_DELETION_CRON_SECRET?.trim();

  if (!privateCronOrigin && !appOrigin) {
    throw new CronRunError("APP_ORIGIN_MISSING");
  }
  if (!cronSecret || cronSecret.length < 32) {
    throw new CronRunError("ACCOUNT_DELETION_CRON_SECRET_INVALID");
  }

  let origin;
  try {
    origin = new URL(privateCronOrigin || appOrigin);
  } catch {
    throw new CronRunError(
      privateCronOrigin
        ? "ACCOUNT_LIFECYCLE_CRON_ORIGIN_INVALID"
        : "APP_ORIGIN_INVALID"
    );
  }

  if (privateCronOrigin) {
    const isRailwayPrivateHost =
      origin.hostname.length > RAILWAY_PRIVATE_HOST_SUFFIX.length &&
      origin.hostname.endsWith(RAILWAY_PRIVATE_HOST_SUFFIX);
    if (origin.protocol !== "http:" || !isRailwayPrivateHost) {
      throw new CronRunError(
        "ACCOUNT_LIFECYCLE_CRON_ORIGIN_MUST_USE_RAILWAY_PRIVATE_HTTP"
      );
    }
  } else {
    const isLocal =
      origin.hostname === "localhost" ||
      origin.hostname === "127.0.0.1" ||
      origin.hostname === "[::1]";
    if (
      origin.protocol !== "https:" &&
      !(isLocal && origin.protocol === "http:")
    ) {
      throw new CronRunError("APP_ORIGIN_MUST_USE_HTTPS");
    }
  }

  if (
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  ) {
    throw new CronRunError(
      privateCronOrigin
        ? "ACCOUNT_LIFECYCLE_CRON_ORIGIN_INVALID"
        : "APP_ORIGIN_INVALID"
    );
  }

  return {
    cronSecret,
    endpoint: new URL("/api/v1/account/deletion/cron", origin),
  };
}

export async function invokeLifecycleEndpoint(
  { cronSecret, endpoint },
  options = {}
) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const sleepImpl = options.sleepImpl ?? sleep;
  const retryDelays = options.retryDelays ?? TRANSPORT_RETRY_DELAYS_MS;
  const onRetry = options.onRetry ?? logTransportRetry;

  for (let index = 0; index < retryDelays.length; index += 1) {
    const delayMs = retryDelays[index];
    if (delayMs > 0) await sleepImpl(delayMs);

    try {
      return await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "x-cron-secret": cronSecret,
        },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(300_000),
      });
    } catch (error) {
      const causeCode = transportFailureCode(error);
      const hasAnotherAttempt = index + 1 < retryDelays.length;
      if (
        !hasAnotherAttempt ||
        !RETRYABLE_TRANSPORT_CODES.has(causeCode)
      ) {
        throw new CronRunError("TRANSPORT_FAILURE", undefined, causeCode);
      }

      onRetry({
        attempt: index + 1,
        causeCode,
        nextDelayMs: retryDelays[index + 1],
      });
    }
  }

  throw new CronRunError("TRANSPORT_FAILURE", undefined, "UNKNOWN");
}

async function main() {
  const response = await invokeLifecycleEndpoint(lifecycleEndpoint());

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

function transportFailureCode(error) {
  const code = error?.cause?.code ?? error?.code;
  if (typeof code === "string" && /^[A-Z0-9_]{1,64}$/.test(code)) {
    return code;
  }

  if (error instanceof Error) {
    const name = error.name.toUpperCase();
    if (/^[A-Z0-9_]{1,64}$/.test(name)) return name;
  }

  return "UNKNOWN";
}

function logTransportRetry({ attempt, causeCode, nextDelayMs }) {
  console.warn(
    JSON.stringify({
      event: "account_lifecycle_cron_transport_retry",
      attempt,
      causeCode,
      nextDelayMs,
    })
  );
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(
      JSON.stringify({
        event: "account_lifecycle_cron_invocation_failed",
        reason: error instanceof CronRunError ? error.reason : error?.name,
        ...(error instanceof CronRunError && error.status
          ? { status: error.status }
          : {}),
        ...(error instanceof CronRunError && error.causeCode
          ? { causeCode: error.causeCode }
          : {}),
      })
    );
    process.exitCode = 1;
  });
}
