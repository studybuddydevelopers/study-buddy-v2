// app/reset-password/update/ResetPasswordUpdateClient.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/Card";
import Heading2 from "@/components/Heading2";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import { FaHandPeace, FaHandPointDown } from "react-icons/fa6";
import { FaHandPaper } from "react-icons/fa";
import Logo from "@/components/Logo";

export default function ResetPasswordUpdateClient() {
  // ----------------------------------
  // ICON ANIMATION
  // ----------------------------------

  const icons = [FaHandPeace, FaHandPaper, FaHandPointDown];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setIndex((i) => (i + 1) % icons.length), 1000);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = icons[index];

  // ----------------------------------
  // EXPIRED TOKEN CHECK
  // ----------------------------------

  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isExpired =
      params.get("error") === "access_denied" &&
      params.get("error_code") === "otp_expired";

    if (isExpired) {
      setExpired(true);
      setTimeout(() => (window.location.href = "/forgot-password"), 2000);
    }
  }, []);

  // ----------------------------------
  // PASSWORD STATE
  // ----------------------------------

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // ----------------------------------
  // SUBMIT HANDLER (REAL SUPABASE FLOW)
  // ----------------------------------

  const handleSubmit = async () => {
    if (password !== confirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    const email = url.searchParams.get("email");

    if (!token || !email) {
      setErrorMessage("Invalid recovery link.");
      return;
    }

    setLoading(true);

    // STEP 1 — verify OTP (restores temp session)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "recovery",
      token,
      email,
    });

    if (verifyError) {
      setErrorMessage(verifyError.message);
      setLoading(false);
      return;
    }

    // STEP 2 — update password
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setErrorMessage(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => (window.location.href = "/dashboard"), 800);
  };

  // ----------------------------------
  // EXPIRED UI
  // ----------------------------------

  if (expired) {
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
            Your password reset link has expired. Redirecting…
          </p>

          <Logo variant="icon" animation="rotate" size="lg" className="text-center" />
        </Card>
      </div>
    );
  }

  // ----------------------------------
  // MAIN UI
  // ----------------------------------

  return (
    <div className="flex items-center justify-center p-7 mt-7 flex-1">
      <Card shadow="md" hover className="flex flex-col w-full max-w-md">
        <div className="flex flex-row justify-center gap-3 items-center">
          <Heading2 gutter="lg">Set a New Password</Heading2>
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

          {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
          {success && <p className="text-green-600 text-sm">Password updated! Redirecting…</p>}

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
