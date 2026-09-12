"use client";

import { useState } from "react";
import LogoName from "./LogoName";
import { SbEqualizerLoadingPattern } from "./SbSequentialFillPreview";
import Button from "./Button";
import Image from "./Image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import StudyBuddyIcon, {
  type StudyBuddyIconName,
} from "./StudyBuddyIcon";
import { useAuthState } from "./AuthStateProvider";

interface NavLink {
  label: string;
  href: string;
  iconName?: StudyBuddyIconName;
  imageSrc?: string;
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
    { label: "Dashboard", href: "/dashboard", iconName: "dashboard" },
    { label: "Study Materials", href: "/materials", iconName: "materials" },
    { label: "Mock Exams", href: "/exams", iconName: "exams" },
    { label: "Progress", href: "/progress", iconName: "progress" },
    { label: "Chat Bot", href: "/chat", iconName: "chat" },
    {
      label: "Profile",
      href: "/profile",
      imageSrc: "/images/profile-avatar.svg",
    },
  ] : [],
  signInLink,
  signUpLink,
  showNotifications = true,
}: Readonly<NavBarProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const { setIsAuthenticated } = useAuthState();
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
      const response = await fetch("/api/v1/logout", {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) {
        setLoadingLogOut(false);
        return;
      }
      setIsAuthenticated(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setLoadingLogOut(false);
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
        <div className="flex items-center gap-2">
          <SbEqualizerLoadingPattern size={28} showMessage={false} />
          <LogoName size="lg" />
        </div>
      </Link>

      <nav className="hidden min-[1110px]:flex min-[1110px]:gap-3 xl:gap-5">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            className={`${linkBase} inline-flex items-center gap-2 ${
              pathname.startsWith(link.href) ? linkActive : ""
            }`}
          >
            {link.iconName && (
              <StudyBuddyIcon
                name={link.iconName}
                size={24}
                className="shrink-0"
              />
            )}
            {link.imageSrc && (
              <Image
                src={link.imageSrc}
                alt=""
                width={28}
                height={28}
                widths={[28, 56]}
                sizes="28px"
                rounded="full"
                className="!h-7 !w-7 shrink-0"
              />
            )}
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center space-x-4">
        <div className="hidden min-[1110px]:flex items-center space-x-3">
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

      </div>
    </header>
  );
}
