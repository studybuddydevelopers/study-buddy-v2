// app/reset-password/update/ResetPasswordUpdateClient.tsx

"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import Heading2 from "@/components/Heading2";
import Button from "@/components/Button";
import TextField from "@/components/TextField";
import { FaHandPeace, FaHandPointDown } from "react-icons/fa6";
import { FaHandPaper } from "react-icons/fa";

export default function ResetPasswordUpdateClient() {
  const icons = [FaHandPeace, FaHandPaper, FaHandPointDown];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % icons.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = icons[index];

  // NEW LOGIC
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

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
    if (password !== confirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const res = await fetch("/api/v1/reset-password/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setErrorMessage(data.error || "Failed to update password");
      return;
    }

    setSuccess(true);

    setTimeout(() => {
      window.location.href = "/login";
    }, 1000);
  };

  return (
    <div className="flex items-center justify-center p-7 mt-7 flex-1">
      <Card shadow="md" hover className="flex flex-col w-full max-w-md">
        <div className="flex flex-row justify-center items-center gap-3">
          <Heading2 gutter="lg" className="text-center">
            Set a New Password
          </Heading2>

          <CurrentIcon
            className="transition-opacity duration-500 ease-in-out animate-[logoFloat_3s_ease-in-out_infinite]"
            size={28}
          />
        </div>

        <div className="flex flex-col gap-5 px-4">
          <TextField
            label="New Password"
            placeholder="Enter a new password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <TextField
            label="Confirm Password"
            placeholder="Re-enter your new password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          {errorMessage && (
            <p className="text-red-500 text-sm">{errorMessage}</p>
          )}

          {success && (
            <p className="text-green-600 text-sm">
              Password updated! Redirecting…
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
