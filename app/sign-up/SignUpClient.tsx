"use client";

import { useState, useEffect } from "react";
import Heading2 from "@/components/Heading2";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import Logo from "@/components/Logo";
import { FaHandPeace, FaHandPointDown } from "react-icons/fa6";
import { FaHandPaper } from "react-icons/fa";

export default function SignUpClient() {
  const [firstName, setFirstName] = useState("");
  const [middleNames, setMiddleNames] = useState("");
  const [lastNames, setLastNames] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");

  const [touched, setTouched] = useState({
    firstName: false,
    lastNames: false,
    email: false,
    phoneNumber: false,
    password: false,
    confirmedPassword: false,
  });

  const [loading, setLoading] = useState(false);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isValidPhone = (v: string) => /^[0-9+\-() ]{6,}$/.test(v);

  const errors = {
    firstName: firstName ? "" : "First name is required",
    lastNames: lastNames ? "" : "Last name is required",
    email: !email
      ? "Email is required"
      : !isValidEmail(email)
      ? "Invalid email format"
      : "",
    phoneNumber: !phoneNumber
      ? "Phone number is required"
      : !isValidPhone(phoneNumber)
      ? "Invalid phone number"
      : "",
    password:
      password.length < 6 ? "Password must be at least 6 characters" : "",
    confirmedPassword:
      confirmedPassword !== password ? "Passwords do not match" : "",
  };

  const isFormValid =
    firstName &&
    lastNames &&
    isValidEmail(email) &&
    isValidPhone(phoneNumber) &&
    password.length >= 6 &&
    confirmedPassword === password;

  const handleSignUp = async () => {
    if (!isFormValid) return;
    setLoading(true);

    const response = await fetch("/api/v1/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        middleNames,
        lastNames,
        email,
        phoneNumber,
        password,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const { error } = await response.json();
      alert(error || "Signup failed");
      return;
    }

    window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center px-4 py-8 sm:py-12 bg-background">

      {/* Brand header — visible on mobile, subtle on desktop */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <Logo variant="full" size="lg" animated />
        <p className="text-sm text-gray-500 text-center">
          Nigeria&apos;s WAEC prep companion
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-accent-500 border border-gray-200 rounded-2xl shadow-md px-6 py-8 sm:px-10 sm:py-10">

        {/* Heading */}
        <div className="flex flex-row items-center justify-center gap-2 mb-6">
          <Heading2 gutter="none" className="text-center">
            Create your account
          </Heading2>
          <CurrentIcon
            className="transition-opacity duration-500 ease-in-out animate-[logoFloat_3s_ease-in-out_infinite] shrink-0"
            size={26}
          />
        </div>

        <div className="flex flex-col gap-4">

          {/* Name row — stacks on mobile, side by side on sm+ */}
          <div className="flex flex-col sm:flex-row gap-4">
            <TextField
              label="First Name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onFocus={() => setTouched((t) => ({ ...t, firstName: true }))}
              error={touched.firstName ? errors.firstName : ""}
              className="flex-1"
            />
            <TextField
              label="Last Names"
              required
              value={lastNames}
              onChange={(e) => setLastNames(e.target.value)}
              onFocus={() => setTouched((t) => ({ ...t, lastNames: true }))}
              error={touched.lastNames ? errors.lastNames : ""}
              className="flex-1"
            />
          </div>

          <TextField
            label="Middle Names"
            value={middleNames}
            onChange={(e) => setMiddleNames(e.target.value)}
          />

          {/* Email + Phone — stacks on mobile */}
          <div className="flex flex-col sm:flex-row gap-4">
            <TextField
              label="Email"
              required
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setTouched((t) => ({ ...t, email: true }))}
              error={touched.email ? errors.email : ""}
              className="flex-1"
            />
            <TextField
              label="Phone Number"
              required
              placeholder="e.g. 08012345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onFocus={() => setTouched((t) => ({ ...t, phoneNumber: true }))}
              error={touched.phoneNumber ? errors.phoneNumber : ""}
              className="flex-1"
            />
          </div>

          {/* Password row — stacks on mobile */}
          <div className="flex flex-col sm:flex-row gap-4">
            <TextField
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setTouched((t) => ({ ...t, password: true }))}
              error={touched.password ? errors.password : ""}
              className="flex-1"
            />
            <TextField
              label="Confirm Password"
              type="password"
              required
              value={confirmedPassword}
              onChange={(e) => setConfirmedPassword(e.target.value)}
              onFocus={() =>
                setTouched((t) => ({ ...t, confirmedPassword: true }))
              }
              error={touched.confirmedPassword ? errors.confirmedPassword : ""}
              className="flex-1"
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full rounded-xl mt-2"
            loading={loading}
            disabled={loading || !isFormValid}
            onClick={handleSignUp}
          >
            Create Account
          </Button>

          <p className="text-center text-sm text-gray-600 mt-1">
            Already part of the family?{" "}
            <a
              href="/login"
              className="font-semibold text-primary-600 hover:underline"
            >
              Log in
            </a>
          </p>

        </div>
      </div>
    </div>
  );
}
