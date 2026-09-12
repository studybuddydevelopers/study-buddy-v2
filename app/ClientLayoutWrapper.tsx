"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/NavBar";
import Footer from "@/components/Footer";
import AuthStateProvider, {
  useUser,
} from "@/components/AuthStateProvider";

const BottomNav = dynamic(() => import("@/components/BottomNav"), {
  ssr: false,
  loading: () => null,
});

export { useUser } from "@/components/AuthStateProvider";

export default function ClientLayoutWrapper({
  children,
  isAuthenticated,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
}) {
  return (
    <AuthStateProvider
      key={isAuthenticated ? "authenticated" : "anonymous"}
      initialIsAuthenticated={isAuthenticated}
    >
      <ClientLayoutChrome>{children}</ClientLayoutChrome>
    </AuthStateProvider>
  );
}

function ClientLayoutChrome({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useUser();

  return (
    <>
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
    </>
  );
}
