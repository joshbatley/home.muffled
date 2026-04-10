import { createContext, useContext } from "react";

export interface ShellUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  forcePasswordChange: boolean;
}

export interface ShellAuthContextValue {
  user: ShellUser | null;
  logout: () => Promise<void>;
  refreshClaims: () => Promise<void>;
}

const ShellAuthContext = createContext<ShellAuthContextValue | null>(null);

export function ShellAuthProvider({
  value,
  children,
}: {
  value: ShellAuthContextValue;
  children: React.ReactNode;
}) {
  return <ShellAuthContext.Provider value={value}>{children}</ShellAuthContext.Provider>;
}

export function useShellAuth(): ShellAuthContextValue {
  const ctx = useContext(ShellAuthContext);
  if (!ctx) throw new Error("useShellAuth must be used within ShellAuthProvider");
  return ctx;
}
