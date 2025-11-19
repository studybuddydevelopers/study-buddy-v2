"use client";

import { useState } from "react";
import Logo from "./Logo";
import Button from "./Button";
import Link from "next/link";

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

        <div className="hidden md:flex items-center space-x-3">
          {!onSignIn && signInLink && 
            <Link href={signInLink}>
              <Button variant="primary" size="sm">
                Log In
              </Button>
            </Link>
          }
          {
            onSignIn && !signInLink &&
            <Button variant="primary" size="sm" onClick={onSignIn}>
              Log In
            </Button>
          }
          
          {!onSignUp && signUpLink && 
            <Link href={signUpLink}>
              <Button variant="outline" size="sm">
                Sign Up
              </Button>
            </Link>
          }
          {
            onSignUp && !signUpLink &&
            <Button variant="outline" size="sm" onClick={onSignUp}>
              Sign Up
            </Button>
          }
          
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-accent-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <Button variant="primary" size="sm" onClick={onSignIn}>
              Sign In
            </Button>
            <Button variant="outline" size="sm" onClick={onSignUp}>
              Sign Up
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
