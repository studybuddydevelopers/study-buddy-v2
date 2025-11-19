"use client";

import { useState } from "react";

import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  const [loadingHome, setLoadingHome] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const handleHome = () => {
    setLoadingHome(true);
    setTimeout(() => {
      window.location.href = "/";
    }, 600);
  };

  const handleReset = () => {
    setLoadingReset(true);
    setTimeout(() => {
      reset();
    }, 300);
  };

  return (
    <div className="flex flex-col justify-center items-center text-center h-full">

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

        {/* Try Again */}
        <Button
          variant="primary"
          size="md"
          onClick={handleReset}
          loading={loadingReset}
          disabled={loadingReset}
        >
          Try Again
        </Button>

        {/* Go Home */}
        <Button
          variant="primary"
          size="md"
          onClick={handleHome}
          loading={loadingHome}
          disabled={loadingHome}
        >
          Go Home
        </Button>

      </div>
    </div>
  );
}
