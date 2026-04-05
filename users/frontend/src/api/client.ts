const REFRESH_KEY = "refresh_token";

let accessToken: string | null = null;
let onLogout: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setLogoutHandler(fn: () => void) {
  onLogout = fn;
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function storeRefreshToken(token: string) {
  localStorage.setItem(REFRESH_KEY, token);
}

export function clearRefreshToken() {
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getStoredRefreshToken();
  if (!refresh) return null;

  const res = await fetch("/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });

  if (!res.ok) {
    clearRefreshToken();
    return null;
  }

  const data = await res.json();
  setAccessToken(data.access_token);
  storeRefreshToken(data.refresh_token);
  return data.access_token;
}

export async function apiFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      onLogout?.();
      return res;
    }
    headers.set("Authorization", `Bearer ${newToken}`);
    res = await fetch(input, { ...init, headers });
    if (res.status === 401) {
      onLogout?.();
    }
  }

  return res;
}
