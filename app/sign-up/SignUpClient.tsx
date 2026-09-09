"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Heading2 from "@/components/Heading2";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import FormErrorMessage from "@/components/FormErrorMessage";
import LogoName from "@/components/LogoName";
import { SbSplashMotionPattern } from "@/components/SbSequentialFillPreview";
import CaptchaChallenge, {
  captchaEnabled,
  type CaptchaChallengeHandle,
} from "@/components/CaptchaChallenge";
import { FaHandPeace, FaHandPointDown } from "react-icons/fa6";
import { FaHandPaper } from "react-icons/fa";
import { readResponseError } from "@/lib/client-response-error";
import { latestAllowedBirthDate, parseBirthDate } from "@/lib/account-age";

const HAND_ICONS = [FaHandPeace, FaHandPaper, FaHandPointDown];

export default function SignUpClient() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [middleNames, setMiddleNames] = useState("");
  const [lastNames, setLastNames] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState<
    "PARENT" | "LEGAL_GUARDIAN"
  >("PARENT");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaChallengeHandle | null>(null);
  const [formError, setFormError] = useState("");

  const [touched, setTouched] = useState({
    firstName: false,
    lastNames: false,
    email: false,
    phoneNumber: false,
    password: false,
    confirmedPassword: false,
    dateOfBirth: false,
    guardianName: false,
    guardianEmail: false,
  });

  const [loading, setLoading] = useState(false);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isValidPhone = (v: string) => /^[0-9+\-() ]{6,}$/.test(v);
  const parsedBirthDate = dateOfBirth ? parseBirthDate(dateOfBirth) : null;
  const isMinor = parsedBirthDate?.ok && parsedBirthDate.ageBand === "MINOR";

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
    dateOfBirth: !dateOfBirth
      ? "Date of birth is required"
      : !parsedBirthDate?.ok
        ? "Enter a valid date of birth"
        : parsedBirthDate.ageBand === "TOO_YOUNG"
          ? "Study Buddy accounts are available from age 13"
          : "",
    guardianName:
      isMinor && guardianName.trim().length < 2
        ? "Parent or legal guardian name is required"
        : "",
    guardianEmail:
      isMinor && !isValidEmail(guardianEmail)
        ? "Enter a valid parent or legal guardian email"
        : isMinor && guardianEmail.trim().toLowerCase() === email.trim().toLowerCase()
          ? "The guardian email must be different from the student email"
          : "",
  };

  const isFormValid =
    firstName &&
    lastNames &&
    isValidEmail(email) &&
    isValidPhone(phoneNumber) &&
    password.length >= 6 &&
    confirmedPassword === password &&
    parsedBirthDate?.ok &&
    parsedBirthDate.ageBand !== "TOO_YOUNG" &&
    (!isMinor ||
      (guardianName.trim().length >= 2 &&
        isValidEmail(guardianEmail) &&
        guardianEmail.trim().toLowerCase() !== email.trim().toLowerCase())) &&
    acceptedTerms;

  const handleSignUp = async () => {
    if (loading) return;
    setFormError("");
    if (!isFormValid) return;
    if (captchaEnabled && !captchaToken) {
      setFormError("Please complete the CAPTCHA challenge.");
      return;
    }

    setLoading(true);
    try {
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
          dateOfBirth,
          guardianName: isMinor ? guardianName : undefined,
          guardianEmail: isMinor ? guardianEmail : undefined,
          guardianRelationship: isMinor ? guardianRelationship : undefined,
          acceptedTerms,
          captchaToken,
        }),
      });

      if (!response.ok) {
        setFormError(
          await readResponseError(
            response,
            "We couldn't create your account. Please try again."
          )
        );
        return;
      }

      router.push(
        response.headers.get("X-Study-Buddy-Next") ||
          `/verify-email?email=${encodeURIComponent(email)}`
      );
    } catch {
      setFormError(
        "We couldn't create your account. Check your connection and try again."
      );
    } finally {
      setLoading(false);
      captchaRef.current?.reset();
    }
  };

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % HAND_ICONS.length);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = HAND_ICONS[index];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center px-4 py-8 sm:py-12 bg-background">

      {/* Brand header — visible on mobile, subtle on desktop */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <SbSplashMotionPattern size={28} />
          <LogoName size="lg" />
        </div>
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
              onChange={(e) => {
                setFirstName(e.target.value);
                setFormError("");
              }}
              onFocus={() => setTouched((t) => ({ ...t, firstName: true }))}
              error={touched.firstName ? errors.firstName : ""}
              className="flex-1"
              autoComplete="given-name"
            />
            <TextField
              label="Last Names"
              required
              value={lastNames}
              onChange={(e) => {
                setLastNames(e.target.value);
                setFormError("");
              }}
              onFocus={() => setTouched((t) => ({ ...t, lastNames: true }))}
              error={touched.lastNames ? errors.lastNames : ""}
              className="flex-1"
              autoComplete="family-name"
            />
          </div>

          <TextField
            label="Middle Names"
            value={middleNames}
            onChange={(e) => {
              setMiddleNames(e.target.value);
              setFormError("");
            }}
            autoComplete="additional-name"
          />

          {/* Email + Phone — stacks on mobile */}
          <div className="flex flex-col sm:flex-row gap-4">
            <TextField
              label="Email"
              required
              placeholder="Enter email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFormError("");
              }}
              onFocus={() => setTouched((t) => ({ ...t, email: true }))}
              error={touched.email ? errors.email : ""}
              className="flex-1"
              type="email"
              autoComplete="email"
            />
            <TextField
              label="Phone Number"
              required
              placeholder="e.g. 08012345678"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                setFormError("");
              }}
              onFocus={() => setTouched((t) => ({ ...t, phoneNumber: true }))}
              error={touched.phoneNumber ? errors.phoneNumber : ""}
              className="flex-1"
              autoComplete="tel"
            />
          </div>

          <TextField
            label="Date of Birth"
            type="date"
            required
            value={dateOfBirth}
            max={latestAllowedBirthDate()}
            onChange={(e) => {
              setDateOfBirth(e.target.value);
              setFormError("");
            }}
            onFocus={() => setTouched((t) => ({ ...t, dateOfBirth: true }))}
            error={touched.dateOfBirth ? errors.dateOfBirth : ""}
            autoComplete="bday"
          />

          {isMinor && (
            <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 space-y-4">
              <p className="text-sm leading-relaxed text-gray-800">
                Because you are under 18, your account will stay locked until a
                parent or legal guardian approves it using a one-time email link.
              </p>
              <TextField
                label="Parent or Legal Guardian Name"
                required
                value={guardianName}
                onChange={(e) => {
                  setGuardianName(e.target.value);
                  setFormError("");
                }}
                onFocus={() => setTouched((t) => ({ ...t, guardianName: true }))}
                error={touched.guardianName ? errors.guardianName : ""}
                autoComplete="name"
              />
              <TextField
                label="Parent or Legal Guardian Email"
                type="email"
                required
                value={guardianEmail}
                onChange={(e) => {
                  setGuardianEmail(e.target.value);
                  setFormError("");
                }}
                onFocus={() => setTouched((t) => ({ ...t, guardianEmail: true }))}
                error={touched.guardianEmail ? errors.guardianEmail : ""}
                autoComplete="email"
              />
              <label className="block text-sm font-semibold text-gray-900">
                Relationship <span className="text-red-500">*</span>
                <select
                  value={guardianRelationship}
                  onChange={(event) =>
                    setGuardianRelationship(
                      event.target.value as "PARENT" | "LEGAL_GUARDIAN"
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-transparent bg-white px-4 py-3 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300"
                >
                  <option value="PARENT">Parent</option>
                  <option value="LEGAL_GUARDIAN">Legal guardian</option>
                </select>
              </label>
            </div>
          )}

          {/* Password row — stacks on mobile */}
          <div className="flex flex-col sm:flex-row gap-4">
            <TextField
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFormError("");
              }}
              onFocus={() => setTouched((t) => ({ ...t, password: true }))}
              error={touched.password ? errors.password : ""}
              className="flex-1"
              autoComplete="new-password"
            />
            <TextField
              label="Confirm Password"
              type="password"
              required
              value={confirmedPassword}
              onChange={(e) => {
                setConfirmedPassword(e.target.value);
                setFormError("");
              }}
              onFocus={() =>
                setTouched((t) => ({ ...t, confirmedPassword: true }))
              }
              error={touched.confirmedPassword ? errors.confirmedPassword : ""}
              className="flex-1"
              autoComplete="new-password"
            />
          </div>

          <CaptchaChallenge
            ref={captchaRef}
            onTokenChange={(token) => {
              setCaptchaToken(token);
              if (token) setFormError("");
            }}
          />

          <label className="flex items-start gap-3 text-sm leading-relaxed text-gray-700">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="mt-1 h-4 w-4 accent-primary-600"
            />
            <span>
              I have read and agree to the{" "}
              <a className="font-semibold text-primary-700 hover:underline" href="/terms-of-service" target="_blank" rel="noreferrer">
                Terms of Service
              </a>{" "}
              and{" "}
              <a className="font-semibold text-primary-700 hover:underline" href="/privacy-policy" target="_blank" rel="noreferrer">
                Privacy Policy
              </a>
              .
            </span>
          </label>

          <FormErrorMessage id="signup-form-error" message={formError} />

          <Button
            variant="primary"
            size="lg"
            className="w-full rounded-xl mt-2"
            loading={loading}
            disabled={loading || !isFormValid || (captchaEnabled && !captchaToken)}
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
