// app/unauthorized/UnauthorizedClient.tsx

"use client";

import Button from "@/components/Button";
import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";

export default function UnauthorizedClient() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Heading1 gutter="sm">Access Denied</Heading1>

      <Paragraph variant="muted">
        You are not authorized to view this page. Please log in or sign up to continue.
      </Paragraph>

      <div className="flex gap-4 mt-6">
        <Button href="/login" variant="primary" size="md">
          Log In
        </Button>

        <Button href="/sign-up" variant="outline" size="md">
          Sign Up
        </Button>
      </div>
    </div>
  );
}
