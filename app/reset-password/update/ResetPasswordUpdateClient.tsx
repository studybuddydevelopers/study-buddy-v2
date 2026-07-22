// app/reset-password/update/ResetPasswordUpdateClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/Card";
import Heading2 from "@/components/Heading2";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import { FaHandPeace, FaHandPointDown } from "react-icons/fa6";
import { FaHandPaper } from "react-icons/fa";
import Logo from "@/components/Logo";

const HAND_ICONS = [FaHandPeace, FaHandPaper, FaHandPointDown];

type LinkStatus = "checking" | "ready" | "expired" | "invalid";
type RecoveryVerification =
  | { kind: "emailToken"; token: string; email: string }
  | { kind: "tokenHash"; tokenHash: string }
  | null;

function getHashParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

export default function ResetPasswordUpdateClient() {
  const router = useRouter();
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("checking");
  const [recoveryVerification, setRecoveryVerification] =
    useState<RecoveryVerification>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % HAND_ICONS.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    async function prepareRecoverySession() {
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const hashParams = getHashParams();
      const error = params.get("error") ?? hashParams.get("error");
      const errorCode =
        params.get("error_code") ?? hashParams.get("error_code");
      const errorDescription =
        params.get("error_description") ??
        hashParams.get("error_description");

      if (error) {
        if (!active) return;
        setErrorMessage(
          errorDescription ||
            (errorCode === "otp_expired"
              ? "Your password reset link has expired."
              : "This password reset link is invalid.")
        );
        setLinkStatus(errorCode === "otp_expired" ? "expired" : "invalid");
        if (errorCode === "otp_expired") {
          redirectTimer = setTimeout(() => router.push("/forgot-password"), 2500);
        }
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;

        if (exchangeError) {
          setErrorMessage(exchangeError.message);
          setLinkStatus("invalid");
          return;
        }

        window.history.replaceState(null, "", "/reset-password/update");
        setRecoveryVerification(null);
        setLinkStatus("ready");
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!active) return;

        if (sessionError) {
          setErrorMessage(sessionError.message);
          setLinkStatus("invalid");
          return;
        }

        window.history.replaceState(null, "", "/reset-password/update");
        setRecoveryVerification(null);
        setLinkStatus("ready");
        return;
      }

      const type = params.get("type");
      const tokenHash = params.get("token_hash");
      if (tokenHash && type === "recovery") {
        setRecoveryVerification({ kind: "tokenHash", tokenHash });
        setLinkStatus("ready");
        return;
      }

      const token = params.get("token");
      const email = params.get("email");
      if (token && email && type === "recovery") {
        setRecoveryVerification({ kind: "emailToken", token, email });
        setLinkStatus("ready");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;

      if (session?.user) {
        setRecoveryVerification(null);
        setLinkStatus("ready");
      } else {
        setErrorMessage("This password reset link is missing its recovery token.");
        setLinkStatus("invalid");
      }
    }

    void prepareRecoverySession();
    return () => {
      active = false;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [router]);

  useEffect(() => {
    if (!document.getElementById("logo-float-keyframes")) {
      const styleEl = document.createElement("style");
      styleEl.id = "logo-float-keyframes";
      styleEl.textContent = `
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  const handleSubmit = async () => {
    setErrorMessage("");

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    if (recoveryVerification?.kind === "emailToken") {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "recovery",
        token: recoveryVerification.token,
        email: recoveryVerification.email,
      });

      if (verifyError) {
        setErrorMessage(verifyError.message);
        setLoading(false);
        return;
      }
    }

    if (recoveryVerification?.kind === "tokenHash") {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "recovery",
        token_hash: recoveryVerification.tokenHash,
      });

      if (verifyError) {
        setErrorMessage(verifyError.message);
        setLoading(false);
        return;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setErrorMessage(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 800);
  };

  const CurrentIcon = HAND_ICONS[index];

  if (linkStatus === "checking") {
    return (
      <div className="flex items-center justify-center p-7 mt-7 flex-1">
        <Card shadow="md" hover className="flex flex-col w-full items-center p-6">
          <Heading2 gutter="sm" className="text-center">
            Checking Reset Link
          </Heading2>
          <Logo variant="icon" animation="rotate" size="lg" className="mt-6" />
        </Card>
      </div>
    );
  }

  if (linkStatus === "expired") {
    return (
      <div className="flex items-center justify-center p-7 mt-7 flex-1">
        <Card shadow="md" hover className="flex flex-col w-full items-center p-2">
          <Heading2 gutter="lg" className="min-w-max text-center">
            Reset Link Expired
          </Heading2>

          <div className="flex flex-row justify-self-center mt-14 mb-10">
            <Logo variant="icon" animation="floatReverse" size="2xl" />
            <Logo variant="icon" animation="float" size="2xl" />
            <Logo variant="icon" animation="floatReverse" size="2xl" />
            <Logo variant="icon" animation="float" size="2xl" />
          </div>

          <p className="text-gray-600 mb-4 px-4 text-center">
            {errorMessage || "Your password reset link has expired."}
          </p>

          <Logo variant="icon" animation="rotate" size="lg" className="text-center" />
        </Card>
      </div>
    );
  }

  if (linkStatus === "invalid") {
    return (
      <div className="flex items-center justify-center p-7 mt-7 flex-1">
        <Card shadow="md" hover className="flex flex-col w-full items-center p-6">
          <Heading2 gutter="sm" className="text-center">
            Invalid Reset Link
          </Heading2>
          <p className="mb-5 max-w-md text-center text-sm text-gray-600">
            {errorMessage || "This password reset link could not be verified."}
          </p>
          <Button variant="primary" onClick={() => router.push("/forgot-password")}>
            Request a new link
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-7 mt-7 flex-1">
      <Card shadow="md" hover className="flex flex-col w-full min-w-max">
        <div className="flex flex-row justify-center w-full">
          <Heading2 gutter="lg" className="min-w-max">
            Set New Password
          </Heading2>
          <CurrentIcon
            className="transition-opacity duration-500 ease-in-out animate-[logoFloat_3s_ease-in-out_infinite]"
            size={28}
          />
        </div>

        <div className="flex flex-col gap-5 px-4 pb-6">
          <TextField
            label="New Password"
            type="password"
            placeholder="Enter a new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <TextField
            label="Confirm Password"
            type="password"
            placeholder="Re-enter your new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          {errorMessage && (
            <p className="text-red-500 text-sm">{errorMessage}</p>
          )}
          {success && (
            <p className="text-green-600 text-sm">
              Password updated! Redirecting...
            </p>
          )}

          <Button
            variant="primary"
            className="w-full rounded-xl"
            loading={loading}
            disabled={loading || !password || !confirm}
            onClick={handleSubmit}
          >
            Update Password
          </Button>
        </div>
      </Card>
    </div>
  );
}
