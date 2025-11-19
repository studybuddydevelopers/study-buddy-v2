"use client";

import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import Link from "next/link";

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  return (
    <div
      className="flex flex-col justify-center items-center text-center h-full"
    >
      <Heading1 gutter="sm">Something went wrong</Heading1>

      <Paragraph variant="muted">
        We encountered an unexpected error while loading this page.
        You can try again, or return to the home page.
      </Paragraph>

      {process.env.NODE_ENV === "development" && (
        <Paragraph variant="error" size="sm" className="break-all">
          {error?.message}
        </Paragraph>
      )}

      <div className="flex justify-center gap-4 mt-4">
        <Button variant="primary" size="md" onClick={reset}>
          Try Again
        </Button>

        <Link href="/" >
          <Button variant="primary" size="md">
            Go Home
          </Button>
        </Link>
      </div>
    </div>

  );
}
