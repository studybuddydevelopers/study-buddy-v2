"use client";

import { createContext, Suspense, useContext } from "react";
import Navbar from "@/components/NavBar";
import Footer from "@/components/Footer";
import type { User } from "@supabase/supabase-js";

export const UserContext = createContext<User | null>(null);
export function useUser() {
  return useContext(UserContext);
}

export default function ClientLayoutWrapper({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User | null;
}) {
  return (
    <UserContext.Provider value={user}>
      {/* Navbar receives the SSR user directly */}
      <Navbar
        user={user}
        signInLink="/login"
        signUpLink="/sign-up"
        onNotificationsClick={() => alert("Notifications clicked")}
      />

      {/* Page content */}
      <Suspense>
        {children}
      </Suspense>

      <Footer />
    </UserContext.Provider>
  );
}
