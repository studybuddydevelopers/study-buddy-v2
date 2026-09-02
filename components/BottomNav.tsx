"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "@/components/Image";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  BarChart2,
  MessageCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ACTIVE_COLOR = "#6C3483";
const INACTIVE_COLOR = "#9CA3AF";

interface NavTab {
  label: string;
  href: string;
  Icon?: LucideIcon;
  imageSrc?: string;
}

const TABS: NavTab[] = [
  { label: "Home", href: "/dashboard", Icon: LayoutDashboard },
  { label: "Materials", href: "/materials", Icon: BookOpen },
  { label: "Exams", href: "/exams", Icon: ClipboardList },
  { label: "Progress", href: "/progress", Icon: BarChart2 },
  { label: "Chat", href: "/chat", Icon: MessageCircle },
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
      className="fixed bottom-0 left-0 right-0 z-50 flex bg-white border-t border-gray-100"
      style={{ height: 64 }}
    >
      {TABS.map(({ label, href, Icon, imageSrc }) => {
        const isActive = pathname.startsWith(href);
        const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;

        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
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
            ) : Icon ? (
              <Icon size={22} color={color} />
            ) : null}
            <span style={{ color, fontSize: 10 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
