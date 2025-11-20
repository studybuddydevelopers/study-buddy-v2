"use client";

import { useState, useEffect } from "react";
import Logo from "./Logo";
import Button from "./Button";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

interface NavBarProps {
  links?: NavLink[];
  onSignIn?: () => void;
  onSignUp?: () => void;
  signInLink?: string;
  signUpLink?: string;
  onNotificationsClick?: () => void;
  showNotifications?: boolean;
}

export default function NavBar({
  links = [
    { label: "Dashboard", href: "/dashboard", active: true },
    { label: "Study Materials", href: "/materials" },
    { label: "Mock Exams", href: "/exams" },
    { label: "Progress", href: "/progress" },
    { label: "Chat Bot", href: "/chat" },
  ],
  onSignIn,
  onSignUp,
  signInLink,
  signUpLink,
  onNotificationsClick,
  showNotifications = true,
}: Readonly<NavBarProps>) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);
  const [loadingLogOut, setLoadingLogOut] = useState(false);

  // 🟢 AUTH STATE (no flicker)
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      const { data } = await supabase.auth.getSession();

      if (active) {
        setUser(data.session?.user ?? null);
        setLoadingUser(false);
      }
    };

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) {
          setUser(session?.user ?? null);
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setLoadingLogOut(true);
    await supabase.auth.signOut();

    setTimeout(() => {
      window.location.href = "/login";
    }, 600);
  };

  const handleLogin = () => {
    setLoadingLogin(true);
    setTimeout(() => {
      if (onSignIn) onSignIn();
      else window.location.href = signInLink ?? "/login";
    }, 600);
  };

  const handleSignup = () => {
    setLoadingSignup(true);
    setTimeout(() => {
      if (onSignUp) onSignUp();
      else window.location.href = signUpLink ?? "/sign-up";
    }, 600);
  };

  const linkBase =
    "text-gray-700 hover:text-primary-500 font-medium transition-colors";
  const linkActive =
    "text-primary-500 font-semibold bg-accent-100 px-3 py-1 rounded-lg";

  return (
    <header className="flex items-center justify-between bg-white shadow px-6 py-3">
      {/* Logo */}
      <Link href="/">
        <Logo variant="full" size="lg" animation="rotate" />
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex space-x-8">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`${linkBase} ${link.active ? linkActive : ""}`}
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center space-x-4">

        {/* AUTH BUTTONS — no flicker */}
        {!loadingUser && (
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
                <button
                  className="text-xl cursor-pointer p-2 rounded-full hover:bg-accent-200 transition"
                  aria-label="Notifications"
                  onClick={onNotificationsClick}
                >
                  🔔
                </button>
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
        )}

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-accent-200"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? "✖" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && !loadingUser && (
        <div className="md:hidden mt-3 flex flex-col space-y-3 bg-white shadow rounded-lg p-4">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`${linkBase} ${link.active ? linkActive : ""}`}
            >
              {link.label}
            </a>
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
