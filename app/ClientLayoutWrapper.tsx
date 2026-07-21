"use client";

import { createContext, Suspense, useContext } from "react";
import Navbar from "@/components/NavBar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
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
      />

      {/* Page content */}
      <div className="pb-16 md:pb-0">
        <Suspense>
          {children}
        </Suspense>
      </div>

      <Footer />

      <div className="md:hidden">
        <BottomNav />
      </div>
    </UserContext.Provider>
  );
}
