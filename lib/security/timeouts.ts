const DEFAULT_EXTERNAL_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_OPENAI_TIMEOUT_MS = 25_000;

export function externalRequestSignal(timeoutMs = externalRequestTimeoutMs()) {
  return AbortSignal.timeout(timeoutMs);
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = externalRequestTimeoutMs()
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
    timeoutMs
  );
  const abortFromCaller = () => controller.abort(init.signal?.reason);

  if (init.signal?.aborted) abortFromCaller();
  else init.signal?.addEventListener("abort", abortFromCaller, { once: true });

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abortFromCaller);
  }
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
