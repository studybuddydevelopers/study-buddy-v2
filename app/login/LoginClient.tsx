"use client";

import { useState, useEffect } from "react";
import Heading2 from "@/components/Heading2";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { FaHandPeace, FaHandPointDown } from "react-icons/fa6";
import { FaHandPaper } from "react-icons/fa";

export default function LoginClient() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [touchedIdentifier, setTouchedIdentifier] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);

  const isEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
  const isPhone = (value: string) => /^[0-9+\-\s().]{6,}$/.test(value);

  useEffect(() => {
    if (!touchedIdentifier) return;
    if (!identifier) setIdentifierError("Please enter email or phone number");
    else if (!isEmail(identifier) && !isPhone(identifier))
      setIdentifierError("Enter a valid email or phone number");
    else setIdentifierError("");
  }, [identifier, touchedIdentifier]);

  useEffect(() => {
    if (!touchedPassword) return;
    if (!password) setPasswordError("Password is required");
    else setPasswordError("");
  }, [password, touchedPassword]);

  const handleLogin = async () => {
    setTouchedIdentifier(true);
    setTouchedPassword(true);
    if (identifierError || passwordError) return;

    setLoading(true);

    const response = await fetch("/api/v1/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    setLoading(false);

    if (!response.ok) {
      const { error } = await response.json();
      alert(error || "Login failed");
      return;
    }

    window.location.href = "/dashboard";
  };

  const icons = [FaHandPeace, FaHandPaper, FaHandPointDown];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % icons.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = icons[index];

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

  const isLoginDisabled =
    loading || !identifier || !password || !!identifierError || !!passwordError;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center px-4 py-8 sm:py-12 bg-background">

      {/* Brand header */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <Logo variant="full" size="lg" animated />
        <p className="text-sm text-gray-500 text-center">
          Nigeria&apos;s WAEC prep companion
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-accent-500 border border-gray-200 rounded-2xl shadow-md px-6 py-8 sm:px-10 sm:py-10">

        <div className="flex flex-row items-center justify-center gap-2 mb-6">
          <Heading2 gutter="none" className="text-center">
            Welcome back
          </Heading2>
          <CurrentIcon
            className="transition-opacity duration-500 ease-in-out animate-[logoFloat_3s_ease-in-out_infinite] shrink-0"
            size={26}
          />
        </div>

        <div className="flex flex-col gap-4">
          <TextField
            label="Email or Phone Number"
            placeholder="Enter your email or phone number"
            value={identifier}
            onFocus={() => setTouchedIdentifier(true)}
            onChange={(e) => setIdentifier(e.target.value)}
            error={touchedIdentifier ? identifierError : ""}
            required
          />

          <TextField
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onFocus={() => setTouchedPassword(true)}
            onChange={(e) => setPassword(e.target.value)}
            error={touchedPassword ? passwordError : ""}
            required
          />

          <a
            href="/forgot-password"
            className="text-sm text-primary-600 hover:underline font-medium w-fit -mt-1"
          >
            Forgot Password?
          </a>

          <Button
            variant="primary"
            size="lg"
            className="w-full rounded-xl mt-1"
            loading={loading}
            disabled={isLoginDisabled}
            onClick={handleLogin}
          >
            Log In
          </Button>

          <p className="text-center text-sm text-gray-600">
            New here?{" "}
            <a
              href="/sign-up"
              className="font-semibold text-primary-600 hover:underline"
            >
              Create an account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
