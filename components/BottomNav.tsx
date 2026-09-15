"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "@/components/Image";
import StudyBuddyIcon, {
  type StudyBuddyIconName,
} from "@/components/StudyBuddyIcon";

const ACTIVE_COLOR = "#6C3483";
const INACTIVE_COLOR = "#9CA3AF";

interface NavTab {
  label: string;
  href: string;
  iconName?: StudyBuddyIconName;
  imageSrc?: string;
}

const TABS: NavTab[] = [
  { label: "Home", href: "/dashboard", iconName: "dashboard" },
  { label: "Materials", href: "/materials", iconName: "materials" },
  { label: "Exams", href: "/exams", iconName: "exams" },
  { label: "Progress", href: "/progress", iconName: "progress" },
  { label: "Chat", href: "/chat", iconName: "chat" },
  {
    label: "Profile",
    href: "/profile",
    imageSrc: "/images/profile-avatar.svg",
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex bg-white border-t border-gray-100"
      style={{
        height: "calc(64px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map(({ label, href, iconName, imageSrc }) => {
        const isActive = pathname.startsWith(href);
        const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;

        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            aria-current={isActive ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-1"
          >
            {imageSrc ? (
              <span
                className={`overflow-hidden rounded-full transition ${
                  isActive
                    ? "ring-2 ring-primary-500 ring-offset-1"
                    : "opacity-60"
                }`}
              >
                <Image
                  src={imageSrc}
                  alt=""
                  width={24}
                  height={24}
                  sizes="24px"
                  widths={[24, 48]}
                  rounded="full"
                  className="!h-6 !w-6 object-cover"
                />
              </span>
            ) : iconName ? (
              <StudyBuddyIcon
                name={iconName}
                size={26}
                className={isActive ? "" : "opacity-55 grayscale-[35%]"}
              />
            ) : null}
            <span className="text-xs leading-none tracking-tight" style={{ color }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
