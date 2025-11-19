"use client";

import { useState, useEffect } from "react";
import Heading2 from "@/components/Heading2";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import { FaHandPeace, FaHandPointDown } from "react-icons/fa6";
import { FaHandPaper } from "react-icons/fa";
import Card from "@/components/Card";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleNames, setMiddleNames] = useState("");
  const [lastNames, setLastNames] = useState("");

  // NEW: Loading state
  const [loading, setLoading] = useState(false);

  const handleSignUp = () => {
    setLoading(true);

    setTimeout(() => {
      setLoading(false);

      // Later you can replace this with API call or router.push("/dashboard")
      console.log("Sign up submitted!");
    }, 600);
  };

  // ICON ROTATION
  const icons = [FaHandPeace, FaHandPaper, FaHandPointDown];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % icons.length);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = icons[index];

  // Inject custom keyframes
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
      <Card shadow="md" hover padding="md" className="flex flex-col self-center min-w-min">
        <div className="flex flex-row self-center justify-center">
          <Heading2 gutter="lg" className="text-center">
            Sign Up 
          </Heading2>

          {/* Animated Icon */}
          <CurrentIcon
            className="transition-opacity duration-500 ease-in-out animate-[logoFloat_3s_ease-in-out_infinite]"
            size={28}
          />
        </div>

        {/* Form fields */}
        <div className="flex flex-col w-fit self-center min-w-[30em]">
          <TextField
            label="First Name"
            placeholder="Enter your first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="text-left mb-5"
            required
          />

          <TextField
            label="Middle Names"
            placeholder="Enter your middle names"
            value={middleNames}
            onChange={(e) => setMiddleNames(e.target.value)}
            className="text-left mb-5"
          />

          <TextField
            label="Last Names"
            placeholder="Enter your last names"
            value={lastNames}
            onChange={(e) => setLastNames(e.target.value)}
            className="text-left mb-5"
            required
          />
          
          <div className="flex flex-row gap-3">
            <TextField
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-left mb-5 w-full"
            />
            
            <TextField
              label="Phone Number"
              placeholder="Enter your phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="text-left mb-5 w-full"
            />
          </div>

          <div className="flex flex-row gap-3">
            <TextField
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="text-left mb-3 w-full"
            />

            <TextField
              label="Confirm Password"
              type="password"
              placeholder="Confirm the password"
              value={confirmedPassword}
              onChange={(e) => setConfirmedPassword(e.target.value)}
              required
              className="text-left mb-3 w-full"
            />
          </div>
          
          <div className="text-left mb-8">
            <span className="text-left text-gray-600 w-fit mr-2">
              Already part of the Family? 
            </span>
            <a
              href="/login"
              className="underline text-left text-gray-600 visited:text-primary-500 hover:text-info w-fit"
            >
              Log in
            </a>
          </div>

          {/* Sign Up Button WITH loading */}
          <Button
            variant="primary"
            size="lg"
            className="w-full rounded-xl"
            loading={loading}
            disabled={loading}
            onClick={handleSignUp}
          >
            Sign Up
          </Button>
        </div>
      </Card>
    </div>
  );
}
