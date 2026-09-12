"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AuthStateContextValue {
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
}

const AuthStateContext = createContext<AuthStateContextValue | null>(null);

export default function AuthStateProvider({
  children,
  initialIsAuthenticated,
}: {
  children: ReactNode;
  initialIsAuthenticated: boolean;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    initialIsAuthenticated
  );
  const value = useMemo(
    () => ({ isAuthenticated, setIsAuthenticated }),
    [isAuthenticated]
  );

  return (
    <AuthStateContext.Provider value={value}>
      {children}
    </AuthStateContext.Provider>
  );
}

export function useAuthState() {
  const value = useContext(AuthStateContext);
  if (!value) {
    throw new Error("useAuthState must be used inside AuthStateProvider");
  }
  return value;
}

export function useUser() {
  return useAuthState().isAuthenticated;
}
