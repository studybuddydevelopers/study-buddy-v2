import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Study Buddy",
  description:
    "Contact Study Buddy for account help, learning support, privacy questions, content corrections, or general enquiries.",
};

export default function ContactUsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
