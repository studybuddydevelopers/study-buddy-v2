"use client";

import { useEffect, useState } from "react";

import Heading1 from "@/components/Heading1";
import Paragraph from "@/components/Paragraph";
import Button from "@/components/Button";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export default function NotFound() {
  const [loadingHome, setLoadingHome] = useState(false);
  const [loadingSupport, setLoadingSupport] = useState(false);

  // Track logged-in user OR loading state
  const [user, setUser] = useState<User | null | "loading">("loading");

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!active) return;

        if (error) {
          console.warn("Error loading user in NotFound:", error.message);
          setUser(null);
        } else {
          setUser(data.user);
        }
      } catch (err) {
        console.warn("Unexpected getUser error:", err);
        setUser(null);
      }
    };

    loadUser();
    return () => {
      active = false;
    };
  }, []);

  const handleHome = () => {
    setLoadingHome(true);
    setTimeout(() => {
      if (user === "loading") {
        window.location.href = "/";
      } else {
        window.location.href = user ? "/dashboard" : "/";
      }
    }, 600);
  };

  const handleSupport = () => {
    setLoadingSupport(true);
    setTimeout(() => {
      window.location.href = "/contact-us";
    }, 600);
  };

  const homeDisabled = loadingHome || user === "loading";

  return (
    <div className="flex flex-col justify-center items-center text-center h-full">

      <Heading1 gutter="sm">Page Not Found</Heading1>

      <Paragraph variant="muted">
        The page you’re looking for doesn’t exist or has been moved.
        Please check the URL or return to the home page.
      </Paragraph>

      <div className="flex justify-center gap-4 mt-4">

        {/* GO HOME */}
        <Button
          variant="primary"
          size="md"
          loading={loadingHome}
          disabled={homeDisabled}
          onClick={handleHome}
        >
          {user === "loading" ? "Loading…" : "Go Home"}
        </Button>

        {/* SUPPORT */}
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
