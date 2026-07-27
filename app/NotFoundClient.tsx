"use client";

import Button from "@/components/Button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "./ClientLayoutWrapper";

export default function NotFoundClient() {
  const router = useRouter();
  const user = useUser();

  const [loadingHome, setLoadingHome] = useState(false);
  const [loadingSupport, setLoadingSupport] = useState(false);

  const handleHome = () => {
    setLoadingHome(true);
    setTimeout(() => {
      router.push(user ? "/dashboard" : "/");
    }, 600);
  };

  const handleSupport = () => {
    setLoadingSupport(true);
    setTimeout(() => {
      router.push("/contact-us");
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
