// app/page.tsx (SERVER COMPONENT)
import type { Metadata } from "next";
import ClientLanding from "./ClientLanding";

export const metadata: Metadata = {
  title: "Study Buddy | Smarter WAEC Exam Preparation",
  description:
    "Build a personalised WAEC study plan, practise exam-style questions, use trusted learning materials, and get AI-powered study support.",
};

export default async function LandingPage() {
  // You can simulate SSR loading here
  await new Promise(r => setTimeout(r, 1000));

  return <ClientLanding />;
}
