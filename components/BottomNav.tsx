"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  BarChart2,
  MessageCircle,
} from "lucide-react";

const ACTIVE_COLOR = "#6C3483";
const INACTIVE_COLOR = "#9CA3AF";

const TABS = [
  { label: "Home", href: "/dashboard", Icon: LayoutDashboard },
  { label: "Materials", href: "/materials", Icon: BookOpen },
  { label: "Exams", href: "/exams", Icon: ClipboardList },
  { label: "Progress", href: "/progress", Icon: BarChart2 },
  { label: "Chat", href: "/chat", Icon: MessageCircle },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex bg-white border-t border-gray-100"
      style={{ height: 64 }}
    >
      {TABS.map(({ label, href, Icon }) => {
        const isActive = pathname.startsWith(href);
        const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;

        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center justify-center gap-1"
          >
            <Icon size={22} color={color} />
            <span style={{ color, fontSize: 10 }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
