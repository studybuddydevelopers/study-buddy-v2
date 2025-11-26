"use client";

import { useState, useEffect } from "react";
import Heading2 from "@/components/Heading2";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import { FaHandPeace, FaHandPointDown } from "react-icons/fa6";
import { FaHandPaper } from "react-icons/fa";
import Card from "@/components/Card";

export default function LoginPage() {
  // await new Promise(r => setTimeout(r, 1000)); // simulate loading
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // Validation errors
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [touchedIdentifier, setTouchedIdentifier] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);

  const isEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
  const isPhone = (value: string) => /^[0-9+\-\s().]{6,}$/.test(value);

  // VALIDATION EFFECTS
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

  // CALLS API ROUTE INSTEAD OF SUPABASE CLIENT
  const handleLogin = async () => {
    setTouchedIdentifier(true);
    setTouchedPassword(true);

    if (identifierError || passwordError) return;

    setLoading(true);

    const response = await fetch("/api/login", {
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

    // SUCCESS
    window.location.href = "/dashboard";
  };

  // ICON ANIMATION
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
    loading ||
    !identifier ||
    !password ||
    !!identifierError ||
    !!passwordError;

  return (
    <div className="flex items-center justify-center p-7 mt-7">
      <Card shadow="md" hover className="flex flex-col min-w-min flex-1">
        <div className="flex flex-row justify-center">
          <Heading2 gutter="lg" className="text-center">
            Welcome back
          </Heading2>

          <CurrentIcon
            className="transition-opacity duration-500 ease-in-out animate-[logoFloat_3s_ease-in-out_infinite]"
            size={28}
          />
        </div>

        <div className="flex flex-col self-center min-w-[-webkit-fill-available]">
          <TextField
            label="Email or Phone Number"
            placeholder="Enter your email or phone number"
            value={identifier}
            onFocus={() => setTouchedIdentifier(true)}
            onChange={(e) => setIdentifier(e.target.value)}
            error={touchedIdentifier ? identifierError : ""}
            className="text-left mb-5"
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
            className="text-left mb-5"
            required
          />

          <a
            href="/forgot-password"
            className="underline text-left mb-6 text-gray-600 visited:text-primary-500 hover:text-info w-fit"
          >
            Forgot Password?
          </a>

          <Button
            variant="primary"
            size="lg"
            className="w-full rounded-xl"
            loading={loading}
            disabled={isLoginDisabled}
            onClick={handleLogin}
          >
            Log In
          </Button>
        </div>
      </Card>
    </div>
  );
}
