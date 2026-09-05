"use client";

import Link from "next/link";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterProps {
  year?: number;
  brand?: string;
  links?: FooterLink[];
}

export default function Footer({
  year = new Date().getFullYear(),
  brand = "Study Buddy",
  links = [
    { label: "About Us", href: "/about-us" },
    { label: "Contact", href: "/contact-us" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
    { label: "Refunds", href: "/refund-policy" },
    { label: "Student Privacy", href: "/parent-student-privacy" },
    { label: "AI Safety", href: "/ai-safety" },
    { label: "Cookies", href: "/cookie-policy" },
    { label: "Accessibility", href: "/accessibility" },
    { label: "Content Policy", href: "/content-policy" },
  ],
}: Readonly<FooterProps>) {
  return (
    <footer className="bg-accent-500 py-6 text-center text-sm mt-2 pb-0">
      {/* Top links */}
      <nav className="mx-auto mb-4 flex max-w-6xl flex-col items-center gap-3 px-6 min-[769px]:flex-row min-[769px]:flex-wrap min-[769px]:justify-center min-[769px]:gap-x-8 min-[769px]:gap-y-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            className="text-gray-500 hover:text-primary-500 transition-colors font-medium"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Copyright */}
      <p className="text-gray-500">
        © {year} {brand}. All rights reserved.
      </p>
    </footer>
  );
}
