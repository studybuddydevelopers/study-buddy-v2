"use client";

import { useState, useEffect } from "react";
import Heading2 from "@/components/Heading2";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import { FaHandPeace, FaHandPointDown } from "react-icons/fa6";
import { FaHandPaper } from "react-icons/fa";
import Card from "@/components/Card";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ICON ROTATION
  const icons = [FaHandPeace, FaHandPaper, FaHandPointDown];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % icons.length);
    }, 1000); // Change every 1 second

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = icons[index];
  // Inject custom keyframes once 
  useEffect(() => {
    if (typeof document === "undefined") return;
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
    <div className="flex items-center justify-center p-7 mt-7">
      <Card shadow="md" hover className="flex flex-col min-w-min">
        <div className="flex flex-row justify-center">
          <Heading2 gutter="lg" className="text-center">
            Welcome back
          </Heading2>

          {/* Animated Icon */}
          <CurrentIcon
            className="transition-opacity duration-500 ease-in-out animate-[logoFloat_3s_ease-in-out_infinite]"
            size={28}
          />
        </div>

        {/* Form fields */}
        <div className="flex flex-col w-fit self-center min-w-sm">
          <TextField
            label="Email or Phone Number"
            placeholder="Enter your email or phone number"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="text-left mb-5"
          />

          <TextField
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="text-left mb-3"
          />

          <a
            href="/forgot-password"
            className="underline text-left mb-6 text-gray-600 visited:text-primary-500 hover:text-info w-fit"
          >
            Forgot Password?
          </a>

          <Button variant="primary" size="lg" className="w-full rounded-xl">
            Log In
          </Button>
        </div>
      </Card>
    </div>
  );
}
