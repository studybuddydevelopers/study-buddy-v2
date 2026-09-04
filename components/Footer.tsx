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
      <nav className="mb-4 flex flex-col items-center gap-3 px-6 min-[769px]:flex-row min-[769px]:justify-around min-[769px]:gap-8">
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
