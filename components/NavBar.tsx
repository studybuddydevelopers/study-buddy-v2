"use client";

import { useState } from "react";
import Logo from "./Logo";
import Button from "./Button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavLink {
  label: string;
  href: string;
}

interface NavBarProps {
  isAuthenticated: boolean;
  links?: NavLink[];
  signInLink?: string;
  signUpLink?: string;
  showNotifications?: boolean;
}

export default function NavBar({
  isAuthenticated,
  links = isAuthenticated ? [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Study Materials", href: "/materials" },
    { label: "Mock Exams", href: "/exams" },
    { label: "Progress", href: "/progress" },
    { label: "Chat Bot", href: "/chat" },
    { label: "Profile", href: "/profile" },
  ] : [],
  signInLink,
  signUpLink,
  showNotifications = true,
}: Readonly<NavBarProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);
  const [loadingLogOut, setLoadingLogOut] = useState(false);

  const linkBase =
    "text-gray-700 hover:text-primary-500 font-medium transition-colors content-center";

  const linkActive =
    "text-primary-500 font-semibold bg-accent-100 px-3 py-1 rounded-lg";

  const handleLogout = async () => {
    setLoadingLogOut(true);
    try {
      await fetch("/api/v1/logout", {
        method: "POST",
        cache: "no-store",
      });
    } finally {
      router.push("/login");
    }
  };

  const handleLogin = () => {
    setLoadingLogin(true);
    router.push(signInLink ?? "/login");
  };

  const handleSignup = () => {
    setLoadingSignup(true);
    router.push(signUpLink ?? "/sign-up");
  };

  return (
    <header className="flex items-center justify-between bg-background shadow px-6 py-3">
      <Link href={isAuthenticated ? "/dashboard" : "/"} prefetch={false}>
        <Logo variant="full" size="lg" animation="rotate" />
      </Link>

      <nav className="hidden md:flex space-x-8">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
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
          {!isAuthenticated && (
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

          {isAuthenticated && (
            <>
              {showNotifications && (
                <div className="relative">
                  <button
                    className="text-xl cursor-pointer p-2 rounded-full hover:bg-accent-200 transition"
                    onClick={() => setNotificationsOpen((open) => !open)}
                    aria-haspopup="dialog"
                    aria-expanded={notificationsOpen}
                    aria-label="Notifications"
                  >
                    🔔
                  </button>

                  {notificationsOpen && (
                    <div
                      className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-yellow-400 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-lg"
                      role="dialog"
                    >
                      Not functional right now! <br/> New feature coming soon!
                    </div>
                  )}
                </div>
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

        {/* Mobile nav is now handled by BottomNav (components/BottomNav.tsx); this toggle is kept but hidden everywhere. */}
        <button
          className="hidden p-2 rounded-md hover:bg-accent-200"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? "✖" : "☰"}
        </button>
      </div>

      {mobileOpen && (
        <div className="hidden mt-3 flex flex-col space-y-3 bg-background shadow rounded-lg p-4">
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
            {!isAuthenticated && (
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

            {isAuthenticated && (
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
