import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Contact Us",
  description:
    "Contact the Study Buddy team for account support, learning help, privacy requests, content corrections, accessibility needs or general enquiries.",
  path: "/contact-us",
});

export default function ContactUsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
