"use client";

import { createContext, Suspense, useContext } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/NavBar";
import Footer from "@/components/Footer";

const BottomNav = dynamic(() => import("@/components/BottomNav"), {
  ssr: false,
  loading: () => null,
});

export const UserContext = createContext(false);
export function useUser() {
  return useContext(UserContext);
}

export default function ClientLayoutWrapper({
  children,
  isAuthenticated,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
}) {
  return (
    <UserContext.Provider value={isAuthenticated}>
      {/* Navbar receives the SSR user directly */}
      <Navbar
        isAuthenticated={isAuthenticated}
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

      {isAuthenticated && (
        <div className="md:hidden">
          <BottomNav />
        </div>
      )}
    </UserContext.Provider>
  );
}
