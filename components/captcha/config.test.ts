import { describe, expect, it } from "vitest";
import { getCaptchaConfig } from "./config";

describe("CAPTCHA public configuration", () => {
  it("keeps legacy key-present behaviour when no explicit enable flag is set", () => {
    expect(
      getCaptchaConfig({
        NEXT_PUBLIC_CAPTCHA_PROVIDER: "turnstile",
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site-key",
      })
    ).toMatchObject({
      enabled: true,
      provider: "turnstile",
      siteKey: "site-key",
      label: "Cloudflare Turnstile",
    });
  });

  it("does not render a widget when CAPTCHA is explicitly disabled", () => {
    expect(
      getCaptchaConfig({
        NEXT_PUBLIC_CAPTCHA_ENABLED: "false",
        NEXT_PUBLIC_CAPTCHA_PROVIDER: "turnstile",
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site-key",
      }).enabled
    ).toBe(false);
  });

  it("requires a site key even when CAPTCHA is explicitly enabled", () => {
    expect(
      getCaptchaConfig({
        NEXT_PUBLIC_CAPTCHA_ENABLED: "true",
        NEXT_PUBLIC_CAPTCHA_PROVIDER: "hcaptcha",
      }).enabled
    ).toBe(false);
  });

  it("uses provider-specific keys before the shared fallback key", () => {
    expect(
      getCaptchaConfig({
        NEXT_PUBLIC_CAPTCHA_ENABLED: "true",
        NEXT_PUBLIC_CAPTCHA_PROVIDER: "hcaptcha",
        NEXT_PUBLIC_CAPTCHA_SITE_KEY: "fallback-key",
        NEXT_PUBLIC_HCAPTCHA_SITE_KEY: "hcaptcha-key",
      }).siteKey
    ).toBe("hcaptcha-key");
  });
});
