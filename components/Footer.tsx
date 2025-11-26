"use client";

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
  ],
}: Readonly<FooterProps>) {
  return (
    <footer className="bg-accent-500 py-6 text-center text-sm mt-2 pb-0">
      {/* Top links */}
      <nav className="flex justify-around space-x-8 mb-3">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-gray-500 hover:text-primary-500 transition-colors font-medium"
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* Copyright */}
      <p className="text-gray-500">
        © {year} {brand}. All rights reserved.
      </p>
    </footer>
  );
}
