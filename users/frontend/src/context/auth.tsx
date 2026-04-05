import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  clearRefreshToken,
  getStoredRefreshToken,
  setAccessToken,
  setLogoutHandler,
  storeRefreshToken,
} from "../api/client";

interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  forcePasswordChange: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      id: payload.user_id,
      email: payload.email,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      forcePasswordChange: payload.force_password_change ?? false,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    const refresh = getStoredRefreshToken();
    if (refresh) {
      await fetch("/v1/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      }).catch(() => {});
    }
    setAccessToken(null);
    clearRefreshToken();
    setUser(null);
  }, []);

  useEffect(() => {
    setLogoutHandler(logout);
  }, [logout]);

  useEffect(() => {
    const refresh = getStoredRefreshToken();
    if (!refresh) {
      setIsLoading(false);
      return;
    }

    fetch("/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setAccessToken(data.access_token);
        storeRefreshToken(data.refresh_token);
        setUser(parseToken(data.access_token));
      })
      .catch(() => {
        clearRefreshToken();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      throw new Error("Invalid credentials");
    }

    const data = await res.json();
    setAccessToken(data.access_token);
    storeRefreshToken(data.refresh_token);
    setUser(parseToken(data.access_token));
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
