const DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_OPENAI_TIMEOUT_MS = 25_000;

export function externalRequestSignal(timeoutMs = externalRequestTimeoutMs()) {
  return AbortSignal.timeout(timeoutMs);
}

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = externalRequestTimeoutMs()
) {
  const timeoutSignal = externalRequestSignal(timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  return fetch(input, { ...init, signal });
}

export function externalRequestTimeoutMs() {
  return positiveIntegerFromEnv(
    "EXTERNAL_REQUEST_TIMEOUT_MS",
    DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS
  );
}

export function openAiClientOptions() {
  return {
    timeout: positiveIntegerFromEnv("OPENAI_TIMEOUT_MS", DEFAULT_OPENAI_TIMEOUT_MS),
    maxRetries: 1,
  };
}

function positiveIntegerFromEnv(name: string, fallback: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
