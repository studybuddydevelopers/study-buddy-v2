"use client";

import { useEffect, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import type { CaptchaProviderProps } from "./types";

export default function HCaptchaChallenge({
  siteKey,
  onTokenChange,
  onHandleChange,
}: CaptchaProviderProps) {
  const captchaRef = useRef<HCaptcha | null>(null);

  useEffect(() => {
    onHandleChange({
      reset() {
        captchaRef.current?.resetCaptcha();
      },
    });

    return () => onHandleChange(null);
  }, [onHandleChange]);

  return (
    <HCaptcha
      ref={captchaRef}
      sitekey={siteKey}
      onVerify={(token) => onTokenChange(token)}
      onExpire={() => onTokenChange(null)}
      onChalExpired={() => onTokenChange(null)}
      onError={() => onTokenChange(null)}
    />
  );
}
