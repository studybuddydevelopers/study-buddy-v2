// app/reset-password/update/ResetPasswordUpdateClient.tsx

"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import Heading2 from "@/components/Heading2";
import Button from "@/components/Button";
import { FaHandPeace, FaHandPointDown } from "react-icons/fa6";
import { FaHandPaper } from "react-icons/fa";

export default function CheckEmailClient() {
  // -----------------------------------------------------
  // ICON ROTATION (same pattern as forgot-password)
  // -----------------------------------------------------
  const icons = [FaHandPeace, FaHandPaper, FaHandPointDown];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % icons.length);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = icons[index];

  // -----------------------------------------------------
  // FLOAT ANIMATION (same injection as forgot-password)
  // -----------------------------------------------------
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
      <Card shadow="md" hover className="flex flex-col w-full max-w-md">
        {/* Heading + Icon */}
        <div className="flex flex-row justify-center items-center gap-3">
          <Heading2 gutter="lg" className="text-center">
            Check Your Email
          </Heading2>

          <CurrentIcon
            className="transition-opacity duration-500 ease-in-out animate-[logoFloat_3s_ease-in-out_infinite]"
            size={28}
          />
        </div>

        {/* Body Text */}
        <p className="text-center text-gray-600 mb-6 px-4">
          If an account exists for the email you entered, you’ll receive a
          password reset link shortly.
        </p>

        {/* Buttons / Actions */}
        <div className="flex flex-col gap-4 w-full px-4 pb-4">
          <a
            href="/login"
            className="underline text-center text-gray-600 hover:text-info visited:text-primary-500"
          >
            Back to Login
          </a>

          <Button
            variant="primary"
            className="w-full rounded-xl"
            onClick={() => (window.location.href = "/forgot-password")}
          >
            Resend Email
          </Button>
        </div>
      </Card>
    </div>
  );
}
