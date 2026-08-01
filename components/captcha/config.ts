export type CaptchaProvider = "hcaptcha" | "turnstile";

interface CaptchaEnvironment {
  [key: string]: string | undefined;
  NEXT_PUBLIC_CAPTCHA_ENABLED?: string;
  NEXT_PUBLIC_CAPTCHA_PROVIDER?: string;
  NEXT_PUBLIC_CAPTCHA_SITE_KEY?: string;
  NEXT_PUBLIC_HCAPTCHA_SITE_KEY?: string;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
}

export interface CaptchaConfig {
  enabled: boolean;
  provider: CaptchaProvider;
  siteKey: string;
  label: string;
}

export function getCaptchaConfig(
  env: CaptchaEnvironment = process.env
): CaptchaConfig {
  const configuredProvider = (env.NEXT_PUBLIC_CAPTCHA_PROVIDER ?? "hcaptcha")
    .toLowerCase();
  const provider: CaptchaProvider =
    configuredProvider === "turnstile" ? "turnstile" : "hcaptcha";
  const siteKey =
    provider === "turnstile"
      ? env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??
        env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ??
        ""
      : env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ??
        env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ??
        "";
  const configuredEnabled = parseOptionalBoolean(env.NEXT_PUBLIC_CAPTCHA_ENABLED);
  const enabled = (configuredEnabled ?? siteKey.length > 0) && siteKey.length > 0;

  return {
    enabled,
    provider,
    siteKey,
    label: provider === "turnstile" ? "Cloudflare Turnstile" : "hCaptcha",
  };
}

function parseOptionalBoolean(value: string | undefined) {
  if (value === undefined || value.trim() === "") return undefined;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return undefined;
}
