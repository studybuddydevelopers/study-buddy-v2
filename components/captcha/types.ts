export interface CaptchaProviderHandle {
  reset: () => void;
}

export interface CaptchaProviderProps {
  siteKey: string;
  onTokenChange: (token: string | null) => void;
  onHandleChange: (handle: CaptchaProviderHandle | null) => void;
}
