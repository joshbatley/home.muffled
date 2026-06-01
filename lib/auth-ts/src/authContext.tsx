import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ApiError,
  loginRequest,
  logoutRequest,
  refreshSessionOrThrow,
  setLogoutHandler,
  validateSession,
} from "./authClient";

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  forcePasswordChange: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshClaims: () => Promise<void>;
  setForcePasswordChanged: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function buildUser(data: {
  user_id: string;
  email: string;
  roles: string[];
  permissions: string[];
  force_password_change: boolean;
}): AuthUser {
  return {
    id: data.user_id,
    email: data.email,
    roles: data.roles || [],
    permissions: data.permissions || [],
    forcePasswordChange: Boolean(data.force_password_change),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = useCallback(() => {
    setUser(null);
  }, []);

  const refreshClaims = useCallback(async () => {
    const valid = await validateSession();
    setUser(buildUser(valid));
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    clearAuth();
  }, [clearAuth]);

  useEffect(() => {
    setLogoutHandler(() => {
      void logout();
    });
  }, [logout]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await refreshSessionOrThrow();
        await refreshClaims();
      } catch {
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };
    void bootstrap();
  }, [clearAuth, refreshClaims]);

  const login = useCallback(
    async (email: string, password: string) => {
      await loginRequest(email, password);
      try {
        await refreshClaims();
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new Error("Failed to initialize session");
      }
    },
    [refreshClaims],
  );

  const setForcePasswordChanged = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, forcePasswordChange: false };
    });
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refreshClaims, setForcePasswordChanged }),
    [user, isLoading, login, logout, refreshClaims, setForcePasswordChanged],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
