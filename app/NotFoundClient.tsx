"use client";

import Button from "@/components/Button";
import { useState } from "react";
import { useUser } from "./ClientLayoutWrapper";

export default function NotFoundClient() {
  const user = useUser();

  const [loadingHome, setLoadingHome] = useState(false);
  const [loadingSupport, setLoadingSupport] = useState(false);

  const handleHome = () => {
    setLoadingHome(true);
    setTimeout(() => {
      window.location.href = user ? "/dashboard" : "/";
    }, 600);
  };

  const handleSupport = () => {
    setLoadingSupport(true);
    setTimeout(() => {
      window.location.href = "/contact-us";
    }, 600);
  };

  return (
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
        loading={loadingSupport}
        disabled={loadingSupport}
        onClick={handleSupport}
      >
        Contact Support
      </Button>
    </div>
  );
}
