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

function validateConfiguredOrigin(value: string) {
  const origin = validateHttpOrigin(value, true);
  const url = new URL(origin);

  if (
    process.env.NODE_ENV === "production" &&
    (url.protocol !== "https:" || isLoopbackHostname(url.hostname))
  ) {
    throw new Error(
      "APP_ORIGIN must be a public HTTPS origin in production."
    );
  }

  return origin;
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
