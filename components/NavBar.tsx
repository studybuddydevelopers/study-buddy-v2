"use client";

import { useState } from "react";
import Logo from "./Logo";
import Button from "./Button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface NavLink {
  label: string;
  href: string;
}

interface NavBarProps {
  user: User | null;
  links?: NavLink[];
  signInLink?: string;
  signUpLink?: string;
  onNotificationsClick?: () => void;
  showNotifications?: boolean;
}

export default function NavBar({
  user,
  links = user ? [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Study Materials", href: "/materials" },
    { label: "Mock Exams", href: "/exams" },
    { label: "Progress", href: "/progress" },
    { label: "Chat Bot", href: "/chat" },
  ] : [],
  signInLink,
  signUpLink,
  onNotificationsClick,
  showNotifications = true,
}: Readonly<NavBarProps>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);
  const [loadingLogOut, setLoadingLogOut] = useState(false);

  const linkBase =
    "text-gray-700 hover:text-primary-500 font-medium transition-colors content-center";

  const linkActive =
    "text-primary-500 font-semibold bg-accent-100 px-3 py-1 rounded-lg";

  const handleLogout = async () => {
    setLoadingLogOut(true);
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleLogin = () => {
    setLoadingLogin(true);
    window.location.href = signInLink ?? "/login";
  };

  const handleSignup = () => {
    setLoadingSignup(true);
    window.location.href = signUpLink ?? "/sign-up";
  };

  return (
    <header className="flex items-center justify-between bg-background shadow px-6 py-3">
      <Link href={user ? "/dashboard" : "/"}>
        <Logo variant="full" size="lg" animation="rotate" />
      </Link>

      <nav className="hidden md:flex space-x-8">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${linkBase} ${
              pathname.startsWith(link.href) ? linkActive : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center space-x-3">
          {!user && (
            <>
              <Button
                variant="primary"
                size="sm"
                loading={loadingLogin}
                disabled={loadingLogin}
                onClick={handleLogin}
              >
                Log In
              </Button>

              <Button
                variant="outline"
                size="sm"
                loading={loadingSignup}
                disabled={loadingSignup}
                onClick={handleSignup}
              >
                Sign Up
              </Button>
            </>
          )}

          {user && (
            <>
              {showNotifications && (
                <button
                  className="text-xl cursor-pointer p-2 rounded-full hover:bg-accent-200 transition"
                  onClick={onNotificationsClick}
                >
                  🔔
                </button>
              )}

              <Button
                variant="outline"
                size="sm"
                loading={loadingLogOut}
                disabled={loadingLogOut}
                onClick={handleLogout}
              >
                Log Out
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 rounded-md hover:bg-accent-200"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? "✖" : "☰"}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden mt-3 flex flex-col space-y-3 bg-background shadow rounded-lg p-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${linkBase} ${
                pathname.startsWith(link.href) ? linkActive : ""
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="flex flex-col space-y-2 mt-4">
            {!user && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  loading={loadingLogin}
                  disabled={loadingLogin}
                  onClick={handleLogin}
                >
                  Sign In
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  loading={loadingSignup}
                  disabled={loadingSignup}
                  onClick={handleSignup}
                >
                  Sign Up
                </Button>
              </>
            )}

            {user && (
              <Button
                variant="outline"
                size="sm"
                loading={loadingLogOut}
                disabled={loadingLogOut}
                onClick={handleLogout}
              >
                Log Out
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
