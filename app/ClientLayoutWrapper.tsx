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
      <main>
        <Suspense>
          {children}
        </Suspense>
      </main>

      <div
        className={
          isAuthenticated
            ? "bg-accent-500 pb-16 min-[1110px]:pb-0"
            : undefined
        }
      >
        <Footer />
      </div>

      {isAuthenticated && (
        <div className="min-[1110px]:hidden">
          <BottomNav />
        </div>
      )}
    </UserContext.Provider>
  );
}
