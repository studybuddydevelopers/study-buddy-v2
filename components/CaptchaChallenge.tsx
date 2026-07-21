"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

export interface CaptchaChallengeHandle {
  reset: () => void;
}

interface CaptchaChallengeProps {
  onTokenChange: (token: string | null) => void;
}

const configuredProvider = (
  process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER ?? "hcaptcha"
).toLowerCase();
const provider = configuredProvider === "turnstile" ? "turnstile" : "hcaptcha";
const siteKey =
  provider === "turnstile"
    ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ??
      process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ??
      ""
    : process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ??
      process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ??
      "";

export const captchaEnabled = siteKey.length > 0;

const captchaLabel =
  provider === "turnstile" ? "Cloudflare Turnstile" : "hCaptcha";

const CaptchaChallenge = forwardRef<
  CaptchaChallengeHandle,
  CaptchaChallengeProps
>(function CaptchaChallenge({ onTokenChange }, ref) {
  const hcaptchaRef = useRef<HCaptcha | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenChange(null);
      hcaptchaRef.current?.resetCaptcha();
      turnstileRef.current?.reset();
    },
  }));

  if (!captchaEnabled) return null;

  return (
    <div className="flex justify-center py-1">
      {provider === "turnstile" ? (
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          onSuccess={(token) => onTokenChange(token)}
          onExpire={() => onTokenChange(null)}
          onError={() => onTokenChange(null)}
          options={{ theme: "light" }}
        />
      ) : (
        <HCaptcha
          ref={hcaptchaRef}
          sitekey={siteKey}
          onVerify={(token) => onTokenChange(token)}
          onExpire={() => onTokenChange(null)}
          onChalExpired={() => onTokenChange(null)}
          onError={() => onTokenChange(null)}
        />
      )}
      <span className="sr-only">{captchaLabel} protection enabled</span>
    </div>
  );
});

export default CaptchaChallenge;
