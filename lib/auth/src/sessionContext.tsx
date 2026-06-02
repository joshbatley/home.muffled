import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";
import type { AppUser, MyPermissionsRow } from "./types";

export interface SessionContextValue {
  session: Session | null;
  user: AppUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setForcePasswordChanged: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function buildUser(row: MyPermissionsRow): AppUser {
  return {
    id: row.user_id,
    email: row.email,
    roles: row.roles ?? [],
    permissions: row.permissions ?? [],
    forcePasswordChange: Boolean(row.force_password_change),
  };
}

async function fetchPermissions(): Promise<AppUser | null> {
  const { data, error } = await supabase.rpc("get_my_permissions");
  if (error || !data) return null;
  return buildUser(data as MyPermissionsRow);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const next = await fetchPermissions();
    setUser(next);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        await refreshUser();
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        void refreshUser().finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await refreshUser();
    },
    [refreshUser],
  );

  const setForcePasswordChanged = useCallback(() => {
    setUser((prev) => (prev ? { ...prev, forcePasswordChange: false } : prev));
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      isLoading,
      login,
      logout,
      refreshUser,
      setForcePasswordChanged,
    }),
    [session, user, isLoading, login, logout, refreshUser, setForcePasswordChanged],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

/** @deprecated use useSession */
export const useAuth = useSession;

/** @deprecated use SessionProvider */
export const AuthProvider = SessionProvider;
