"use client";

import { useState, useEffect } from "react";
import Heading2 from "@/components/Heading2";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import { FaHandPeace, FaHandPointDown } from "react-icons/fa6";
import { FaHandPaper } from "react-icons/fa";
import Card from "@/components/Card";
import { supabase } from "@/lib/supabaseClient";

export default function SignUpPage() {
  // FIELD STATES
  const [firstName, setFirstName] = useState("");
  const [middleNames, setMiddleNames] = useState("");
  const [lastNames, setLastNames] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");

  // TRACK TOUCHED FIELDS
  const [touched, setTouched] = useState({
    firstName: false,
    lastNames: false,
    email: false,
    phoneNumber: false,
    password: false,
    confirmedPassword: false,
  });

  const [loading, setLoading] = useState(false);

  // VALIDATION HELPERS
  const isValidEmail = (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const isValidPhone = (v: string) =>
    /^[0-9+\-() ]{6,}$/.test(v);

  // FIELD ERRORS
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
      password.length < 6
        ? "Password must be at least 6 characters"
        : "",

    confirmedPassword:
      confirmedPassword !== password
        ? "Passwords do not match"
        : "",
  };

  // FORM VALIDITY
  const isFormValid =
    firstName &&
    lastNames &&
    isValidEmail(email) &&
    isValidPhone(phoneNumber) &&
    password.length >= 6 &&
    confirmedPassword === password;

  // SIGN UP HANDLER
  const handleSignUp = async () => {
    if (!isFormValid) return;

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName,
          middleNames,
          lastNames,
          phoneNumber,
        },
      },
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;

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

  return (
    <div className="flex items-center justify-center p-7 mt-7">
      <Card shadow="md" hover padding="md" className="flex flex-col self-center min-w-min">

        {/* HEADER */}
        <div className="flex flex-row self-center justify-center">
          <Heading2 gutter="lg" className="text-center">
            Sign Up
          </Heading2>
          <CurrentIcon
            className="transition-opacity duration-500 ease-in-out animate-[logoFloat_3s_ease-in-out_infinite]"
            size={28}
          />
        </div>

        {/* FORM */}
        <div className="flex flex-col w-fit self-center min-w-[30em]">

          {/* FIRST NAME */}
          <TextField
            label="First Name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onFocus={() => setTouched((t) => ({ ...t, firstName: true }))}
            error={touched.firstName ? errors.firstName : ""}
            className="mb-5"
          />

          {/* MIDDLE NAMES */}
          <TextField
            label="Middle Names"
            value={middleNames}
            onChange={(e) => setMiddleNames(e.target.value)}
            className="mb-5"
          />

          {/* LAST NAMES */}
          <TextField
            label="Last Names"
            required
            value={lastNames}
            onChange={(e) => setLastNames(e.target.value)}
            onFocus={() => setTouched((t) => ({ ...t, lastNames: true }))}
            error={touched.lastNames ? errors.lastNames : ""}
            className="mb-5"
          />

          {/* EMAIL + PHONE */}
          <div className="flex flex-row gap-3">
            <TextField
              label="Email"
              required
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setTouched((t) => ({ ...t, email: true }))}
              error={touched.email ? errors.email : ""}
              className="mb-5 w-full"
            />

            <TextField
              label="Phone Number"
              required
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onFocus={() =>
                setTouched((t) => ({ ...t, phoneNumber: true }))
              }
              error={touched.phoneNumber ? errors.phoneNumber : ""}
              className="mb-5 w-full"
            />
          </div>

          {/* PASSWORDS */}
          <div className="flex flex-row gap-3">
            <TextField
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setTouched((t) => ({ ...t, password: true }))}
              error={touched.password ? errors.password : ""}
              className="mb-3 w-full"
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
              className="mb-3 w-full"
            />
          </div>

          {/* LOGIN LINK */}
          <div className="text-left mb-8">
            <span className="text-gray-600 mr-2">Already part of the Family?</span>
            <a
              href="/login"
              className="underline text-gray-600 hover:text-info"
            >
              Log in
            </a>
          </div>

          {/* SUBMIT BUTTON */}
          <Button
            variant="primary"
            size="lg"
            className="w-full rounded-xl"
            loading={loading}
            disabled={loading || !isFormValid}
            onClick={handleSignUp}
          >
            Sign Up
          </Button>

        </div>
      </Card>
    </div>
  );
}
