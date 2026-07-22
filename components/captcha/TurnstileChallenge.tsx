"use client";

import { useEffect, useRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import type { CaptchaProviderProps } from "./types";

export default function TurnstileChallenge({
  siteKey,
  onTokenChange,
  onHandleChange,
}: CaptchaProviderProps) {
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  useEffect(() => {
    onHandleChange({
      reset() {
        turnstileRef.current?.reset();
      },
    });

    return () => onHandleChange(null);
  }, [onHandleChange]);

  return (
    <Turnstile
      ref={turnstileRef}
      siteKey={siteKey}
      onSuccess={(token) => onTokenChange(token)}
      onExpire={() => onTokenChange(null)}
      onError={() => onTokenChange(null)}
      options={{ theme: "light" }}
    />
  );
}
