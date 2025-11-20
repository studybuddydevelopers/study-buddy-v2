// app/ClientLayoutWrapper.tsx
"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/NavBar";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
        <Navbar
            links={[]}
            signInLink="/login"
            signUpLink="/sign-up"
            onNotificationsClick={() => alert("Notifications clicked")}
        />
        {children}
        <Footer />
    </>
  );
}
