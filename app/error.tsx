"use client";

import { useEffect, useState } from "react";

import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  const [loadingHome, setLoadingHome] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  // Using "loading" sentinel so user state is not prematurely used
  const [user, setUser] = useState<User | null | "loading">("loading");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!active) return;
        if (error) {
          console.warn("Error reading user in GlobalError:", error.message);
          setUser(null);
        } else {
          setUser(data.user);
        }
      } catch (err) {
        console.warn("Unexpected getUser() error:", err);
        setUser(null);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const handleHome = () => {
    setLoadingHome(true);

    setTimeout(() => {
      // If user is still loading, always send to "/"
      if (user === "loading") {
        window.location.href = "/";
      } else {
        window.location.href = user ? "/dashboard" : "/";
      }
    }, 600);
  };

  const handleReset = () => {
    setLoadingReset(true);
    setTimeout(() => reset(), 300);
  };

  const homeDisabled =
    loadingHome || user === "loading"; // disable Home until user is known

  return (
    <div className="flex flex-col justify-center items-center text-center h-full">
      <Heading1 gutter="sm">Something went wrong</Heading1>

      <Paragraph variant="muted">
        We encountered an unexpected error while loading this page.
        You can try again, or return to the home page.
      </Paragraph>

      {process.env.NODE_ENV === "development" && (
        <Paragraph
          variant="error"
          size="sm"
          className="break-all text-red-600"
        >
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
          disabled={homeDisabled}
        >
          {user === "loading" ? "Loading…" : "Go Home"}
        </Button>

      </div>
    </div>
  );
}
