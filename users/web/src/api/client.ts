const REFRESH_KEY = "refresh_token";

let accessToken: string | null = null;
let onLogout: (() => void) | null = null;
let refreshInFlight: Promise<string | null> | null = null;

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  force_password_change: boolean;
};

type ValidateResponse = {
  user_id: string;
  email: string;
  roles: string[];
  permissions: string[];
  force_password_change: boolean;
  exp: number;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setLogoutHandler(fn: () => void) {
  onLogout = fn;
}

export function hasAccessToken() {
  return Boolean(accessToken);
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

async function readErrorMessage(res: Response): Promise<string> {
  const fallback = `Request failed (${res.status})`;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => null);
    if (data && typeof data.error === "string") {
      return data.error;
    }
    return fallback;
  }
  const text = await res.text().catch(() => "");
  return text || fallback;
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

  const data = (await res.json()) as TokenResponse;
  setAccessToken(data.access_token);
  storeRefreshToken(data.refresh_token);
  return data.access_token;
}

async function refreshAccessTokenOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function withAuthHeaders(init: RequestInit = {}): Headers {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return headers;
}

export async function apiFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = withAuthHeaders(init);
  let res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    const newToken = await refreshAccessTokenOnce();
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

export async function apiFetchOrThrow(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await apiFetch(input, init);
  if (!res.ok) {
    const msg = await readErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res;
}

export async function apiJSON<T>(
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await apiFetchOrThrow(input, init);
  return (await res.json()) as T;
}

export async function loginRequest(email: string, password: string) {
  const res = await fetch("/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new ApiError(res.status, await readErrorMessage(res));
  }

  const data = (await res.json()) as TokenResponse;
  setAccessToken(data.access_token);
  storeRefreshToken(data.refresh_token);
  return data;
}

export async function logoutRequest() {
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
}

export async function refreshSessionOrThrow() {
  const token = await refreshAccessTokenOnce();
  if (!token) {
    throw new ApiError(401, "Session expired");
  }
  return token;
}

export async function validateSession(): Promise<ValidateResponse> {
  return apiJSON<ValidateResponse>("/v1/auth/validate", { method: "GET" });
}

export async function postJSON<T>(input: string, body: unknown): Promise<T> {
  return apiJSON<T>(input, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function putJSON<T>(input: string, body: unknown): Promise<T> {
  return apiJSON<T>(input, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function postNoContent(input: string, body: unknown) {
  await apiFetchOrThrow(input, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function putNoContent(input: string, body: unknown) {
  await apiFetchOrThrow(input, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteNoContent(input: string) {
  await apiFetchOrThrow(input, {
    method: "DELETE",
  });
}
