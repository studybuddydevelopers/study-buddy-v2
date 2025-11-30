// app/forgot-password/ForgotPasswordClient.tsx

"use client";

import { useState, useEffect } from "react";
import Heading2 from "@/components/Heading2";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import { FaHandPeace, FaHandPointDown } from "react-icons/fa6";
import { FaHandPaper } from "react-icons/fa";
import Card from "@/components/Card";

export default function ResetPasswordClient() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccess(false);

    const res = await fetch("/api/v1/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identifier }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setErrorMessage(data.error || "Something went wrong");
      return;
    }

    setSuccess(true);

    setTimeout(() => {
      window.location.href = "/check-email";
    }, 800);
  };

  // ICON rotation animation
  const icons = [FaHandPeace, FaHandPaper, FaHandPointDown];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % icons.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = icons[index];

  // Inject float animation keyframes once
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

  return (
    <div className="flex items-center justify-center p-7 mt-7 flex-1">
      <Card shadow="md" hover className="flex flex-col">
        <div className="flex flex-row justify-center">
          <Heading2 gutter="lg" className="text-center">
            New Password Request
          </Heading2>

          <CurrentIcon
            className="transition-opacity duration-500 ease-in-out animate-[logoFloat_3s_ease-in-out_infinite]"
            size={28}
          />
        </div>

        <div className="flex flex-col w-fit self-center min-w-sm min-w-[-webkit-fill-available]">
          <TextField
            label="Email"
            placeholder="Enter your email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className="text-left mb-5"
          />

          {errorMessage && (
            <p className="text-red-500 text-sm mb-4">{errorMessage}</p>
          )}

          {success && (
            <p className="text-green-600 text-sm mb-4">
              Reset link sent! Check your inbox.
            </p>
          )}

          <a
            href="/login"
            className="underline text-left mb-6 text-gray-600 visited:text-primary-500 hover:text-info w-fit"
          >
            Remember Your Password? Login
          </a>

          <Button
            variant="primary"
            size="lg"
            className="w-full rounded-xl"
            loading={loading}
            disabled={loading || !identifier}
            onClick={handleSubmit}
          >
            Submit
          </Button>
        </div>
      </Card>
    </div>
  );
}
