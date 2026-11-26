const LOCAL_DEVELOPMENT_ORIGIN = "http://localhost:3000";

export function authRedirectUrl(pathname: string, requestUrl?: string) {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    throw new Error("Auth redirect paths must be root-relative.");
  }

  return new URL(pathname, `${trustedAppOrigin(requestUrl)}/`).toString();
}

export function trustedAppOrigin(requestUrl?: string) {
  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  if (configuredOrigin) return validateConfiguredOrigin(configuredOrigin);

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_ORIGIN is required for authentication emails.");
  }

  if (requestUrl) {
    try {
      return validateHttpOrigin(new URL(requestUrl).origin, false);
    } catch {
      // Use the predictable development origin when the request URL is absent
      // or malformed. Production never trusts the incoming Host header.
    }
  }

  return LOCAL_DEVELOPMENT_ORIGIN;
}

export function isolatedE2eSupabaseOrigin() {
  const value = process.env.APP_ORIGIN?.trim() ?? "";
  return URL.canParse(value) ? getIsolatedE2eSupabaseOrigin(new URL(value)) : null;
}

function validateConfiguredOrigin(value: string) {
  const origin = validateHttpOrigin(value, true);
  const url = new URL(origin);

  if (
    process.env.NODE_ENV === "production" &&
    (url.protocol !== "https:" || isLoopbackHostname(url.hostname)) &&
    !getIsolatedE2eSupabaseOrigin(url)
  ) {
    throw new Error(
      "APP_ORIGIN must be a public HTTPS origin in production."
    );
  }

  return origin;
}

function getIsolatedE2eSupabaseOrigin(appOrigin: URL) {
  if (
    process.env.STUDY_BUDDY_E2E_TEST_MODE !== "true" ||
    process.env.RAILWAY_ENVIRONMENT_ID ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.VERCEL ||
    appOrigin.protocol !== "http:" ||
    !isLoopbackHostname(appOrigin.hostname) ||
    !isLoopbackDatabaseUrl(process.env.DATABASE_URL)
  ) {
    return null;
  }

  const value = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!URL.canParse(value)) return null;

  const url = new URL(value);
  return (url.protocol === "http:" || url.protocol === "https:") &&
    isLoopbackHostname(url.hostname) && !url.username && !url.password
    ? url.origin
    : null;
}

function isLoopbackDatabaseUrl(value: string | undefined) {
  if (!value?.trim()) return false;

  try {
    const url = new URL(value);
    return (
      (url.protocol === "postgres:" || url.protocol === "postgresql:") &&
      isLoopbackHostname(url.hostname)
    );
  } catch {
    return false;
  }
}

function validateHttpOrigin(value: string, requireOriginOnly: boolean) {
  const url = new URL(value);
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password
  ) {
    throw new Error("APP_ORIGIN must be an HTTP(S) origin.");
  }

  if (
    requireOriginOnly &&
    (url.pathname !== "/" || url.search || url.hash)
  ) {
    throw new Error("APP_ORIGIN must not contain a path, query, or fragment.");
  }

  return url.origin;
}

function isLoopbackHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "::1" ||
    normalized === "0.0.0.0" ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
}
