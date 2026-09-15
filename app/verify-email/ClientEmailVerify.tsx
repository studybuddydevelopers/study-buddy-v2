"use client";

import { useSearchParams } from "next/navigation";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Heading1 from "@/components/Heading1";
import Link from "next/link";
import StudyBuddyIcon from "@/components/StudyBuddyIcon";

export default function ClientEmailVerify() {
  const params = useSearchParams();
  const email = params.get("email") || "your email address";
  const status = params.get("status");
  const confirmed = status === "confirmed";
  const linkFailed = status === "expired" || status === "invalid";

  return (
    <div className="flex items-center justify-center p-7 mt-7">
      <Card shadow="md" hover padding="sm" className="flex flex-col min-w-min">

        {confirmed && (
          <div className="mb-3 flex justify-center">
            <StudyBuddyIcon
              name="success"
              size={88}
              title="Email successfully verified"
            />
          </div>
        )}

        <Heading1 gutter="md" className="text-center">
          {confirmed
            ? "Email verified"
            : linkFailed
              ? "Email Link Not Valid"
              : "Verify Your Email"}
        </Heading1>

        <Paragraph align="center" variant="muted" className="mb-6 mt-6">
          {confirmed ? (
            <>
              Your email address has been successfully verified. Your Study
              Buddy account is ready—log in with your email and password to
              continue.
            </>
          ) : linkFailed ? (
            <>
              This confirmation link is invalid, expired, or has already been
              used. If you already confirmed your email, try logging in.
              Otherwise, contact support@studybuddyng.com.
            </>
          ) : (
            <>
              We’ve sent a verification link to <br />
              <span className="font-semibold text-gray-900">{email}</span>
              <br /><br />
              Please check your inbox and click the link to activate your
              account.
            </>
          )}
        </Paragraph>

        <div className="flex justify-center">
          <Link href="/login">
            <Button variant="primary" size="lg" className="rounded-xl">
              {confirmed ? "Log in to Study Buddy" : "Go to Login"}
            </Button>
          </Link>
        </div>

      </Card>
    </div>
  );
}
