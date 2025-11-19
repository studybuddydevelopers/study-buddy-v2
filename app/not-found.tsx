"use client";

import { useState } from "react";

import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";

export default function NotFound() {
  const [loadingHome, setLoadingHome] = useState(false);
  const [loadingSupport, setLoadingSupport] = useState(false);

  const handleHome = () => {
    setLoadingHome(true);
    setTimeout(() => {
      window.location.href = "/";
    }, 600);
  };

  const handleSupport = () => {
    setLoadingSupport(true);
    setTimeout(() => {
      window.location.href = "/contact-us";
    }, 600);
  };

  return (
    <div className="flex flex-col justify-center items-center text-center h-full">

      <Heading1 gutter="sm">Page Not Found</Heading1>

      <Paragraph variant="muted">
        The page you’re looking for doesn’t exist or has been moved.  
        Please check the URL or return to the home page.
      </Paragraph>

      <div className="flex justify-center gap-4 mt-4">

        <Button
          variant="primary"
          size="md"
          loading={loadingHome}
          disabled={loadingHome}
          onClick={handleHome}
        >
          Go Home
        </Button>

        <Button
          variant="secondary"
          size="md"
          className="p-6"
          loading={loadingSupport}
          disabled={loadingSupport}
          onClick={handleSupport}
        >
          Contact Support
        </Button>

      </div>
    </div>
  );
}
