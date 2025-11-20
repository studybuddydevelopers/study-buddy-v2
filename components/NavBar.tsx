"use client";

import { useState, useEffect } from "react";
import Logo from "./Logo";
import Button from "./Button";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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

  // NEW: loading states
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);
  const [loadingLogOut, setLoadingLogOut] = useState(false);

  // NEW: user session state
  const [user, setUser] = useState(null);

  // 🔥 Check login state on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };

    checkSession();

    // 🔥 Listen for login/logout in real-time
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setLoadingLogOut(true);
    await supabase.auth.signOut();
    setTimeout(() => {
      window.location.href = "/login";
      setLoadingLogOut(false);
    }, 600);
  };

  const handleLogin = () => {
    setLoadingLogin(true);
    setTimeout(() => {
      if (onSignIn) onSignIn();
      else if (signInLink) window.location.href = signInLink;
      setLoadingLogin(false);
    }, 600);
  };

  const handleSignup = () => {
    setLoadingSignup(true);
    setTimeout(() => {
      if (onSignUp) onSignUp();
      else if (signUpLink) window.location.href = signUpLink;
      setLoadingSignup(false);
    }, 600);
  };

  const linkBase =
    "text-gray-700 hover:text-primary-500 font-medium transition-colors";
  const linkActive =
    "text-primary-500 font-semibold bg-accent-100 px-3 py-1 rounded-lg";

  return (
    <header className="flex items-center justify-between bg-white shadow px-6 py-3">
      {/* Left: Logo */}
      <div className="flex items-center space-x-2">
        <Link href="/">
          <Logo variant="full" size="lg" animation="rotate" />
        </Link>
      </div>

      {/* Center: Desktop Links */}
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

      {/* Right: Notifications + Buttons */}
      <div className="flex items-center space-x-4">
        {showNotifications && (
          <button
            className="text-xl cursor-pointer p-2 rounded-full hover:bg-accent-200 transition"
            aria-label="Notifications"
            onClick={onNotificationsClick}
          >
            🔔
          </button>
        )}

        {/* Desktop buttons */}
        <div className="hidden md:flex items-center space-x-3">

          {/* 🔥 CONDITIONAL BUTTONS */}

          {!user && (
            <>
              {/* LOGIN BUTTON */}
              <Button
                variant="primary"
                size="sm"
                loading={loadingLogin}
                disabled={loadingLogin}
                onClick={handleLogin}
              >
                Log In
              </Button>

              {/* SIGNUP BUTTON */}
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

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-accent-200"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? "✖" : "☰"}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
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
            
            {/* MOBILE CONDITIONAL BUTTONS */}
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
