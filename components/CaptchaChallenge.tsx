"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import dynamic from "next/dynamic";
import { getCaptchaConfig } from "./captcha/config";
import type {
  CaptchaProviderHandle,
  CaptchaProviderProps,
} from "./captcha/types";

export interface CaptchaChallengeHandle {
  reset: () => void;
}

interface CaptchaChallengeProps {
  onTokenChange: (token: string | null) => void;
}

const { enabled, provider, siteKey, label: captchaLabel } = getCaptchaConfig();

export const captchaEnabled = enabled;

const HCaptchaChallenge = dynamic(
  () => import("./captcha/HCaptchaChallenge"),
  { ssr: false, loading: () => <CaptchaLoading label={captchaLabel} /> }
);

const TurnstileChallenge = dynamic(
  () => import("./captcha/TurnstileChallenge"),
  { ssr: false, loading: () => <CaptchaLoading label={captchaLabel} /> }
);

function CaptchaLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-16 items-center justify-center text-sm text-gray-500">
      Loading {label}...
    </div>
  );
}

const CaptchaChallenge = forwardRef<
  CaptchaChallengeHandle,
  CaptchaChallengeProps
>(function CaptchaChallenge({ onTokenChange }, ref) {
  const providerHandleRef = useRef<CaptchaProviderHandle | null>(null);

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenChange(null);
      providerHandleRef.current?.reset();
    },
  }), [onTokenChange]);

  if (!captchaEnabled) return null;

  const Provider =
    provider === "turnstile" ? TurnstileChallenge : HCaptchaChallenge;
  const providerProps: CaptchaProviderProps = {
    siteKey,
    onTokenChange,
    onHandleChange: (handle) => {
      providerHandleRef.current = handle;
    },
  };

  return (
    <div className="flex justify-center py-1">
      <Provider {...providerProps} />
      <span className="sr-only">{captchaLabel} protection enabled</span>
    </div>
  );
});

export default CaptchaChallenge;
