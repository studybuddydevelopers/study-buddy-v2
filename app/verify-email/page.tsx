"use client";

import { useSearchParams } from "next/navigation";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Heading1 from "@/components/Heading1";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const email = params.get("email");

  const safeEmail = email || "your email address";

  return (
    <div className="flex items-center justify-center p-7 mt-7">
      <Card shadow="md" hover padding="sm" className="flex flex-col min-w-min">

        <Heading1 gutter="md" className="text-left w-max">
          Verify Your Email
        </Heading1>

        <br />

        <Paragraph align="center" variant="muted" className="mb-6">
          We’ve sent a verification link to <br />
          <span className="font-semibold text-gray-900">
            {safeEmail}
          </span>
          <br />
          <br />
          Please check your inbox and click the link to activate your account.
        </Paragraph>

        <br />

        <div className="flex justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() => (window.location.href = "/login")}
            className="rounded-xl"
          >
            Go to Login
          </Button>
        </div>

      </Card>
    </div>
  );
}
