const REFRESH_KEY = "refresh_token";

let accessToken: string | null = null;
let onLogout: (() => void) | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  force_password_change: boolean;
}

export interface ValidateResponse {
  user_id: string;
  email: string;
  roles: string[];
  permissions: string[];
  force_password_change: boolean;
  exp: number;
}

export interface MeResponse {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  roles: string[];
  permissions: string[];
  force_password_change: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role_ids: string[];
}

export interface UpdateUserRequest {
  email: string;
  display_name: string;
  avatar_url: string;
}

export interface CreateRoleRequest {
  name: string;
}

export interface CreatePermissionRequest {
  key: string;
  description: string;
}

export interface AssignRolesRequest {
  role_ids: string[];
}

export interface AssignPermissionsRequest {
  permission_ids: string[];
}

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

export function hasAccessToken(): boolean {
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

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
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

export async function apiFetchOrThrow(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await apiFetch(input, init);
  if (!res.ok) {
    const msg = await readErrorMessage(res);
    throw new ApiError(res.status, msg);
  }
  return res;
}

export async function getJSON<T>(input: string): Promise<T> {
  const res = await apiFetchOrThrow(input, { method: "GET" });
  return (await res.json()) as T;
}

export async function postJSON<T>(input: string, body: unknown): Promise<T> {
  const res = await apiFetchOrThrow(input, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export async function putJSON<T>(input: string, body: unknown): Promise<T> {
  const res = await apiFetchOrThrow(input, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export async function deleteJSON<T>(input: string): Promise<T> {
  const res = await apiFetchOrThrow(input, { method: "DELETE" });
  return (await res.json()) as T;
}

export async function postNoContent(input: string, body: unknown): Promise<void> {
  await apiFetchOrThrow(input, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function putNoContent(input: string, body: unknown): Promise<void> {
  await apiFetchOrThrow(input, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteNoContent(input: string): Promise<void> {
  await apiFetchOrThrow(input, { method: "DELETE" });
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const res = await apiFetchOrThrow("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password } satisfies LoginRequest),
  });

  const data = (await res.json()) as TokenResponse;
  setAccessToken(data.access_token);
  storeRefreshToken(data.refresh_token);
  return data;
}

export async function logout(): Promise<void> {
  const refresh = getStoredRefreshToken();
  if (refresh) {
    await apiFetch("/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refresh }),
    }).catch(() => {});
  }
  setAccessToken(null);
  clearRefreshToken();
}

export async function refreshSession(): Promise<string> {
  const token = await refreshAccessTokenOnce();
  if (!token) {
    throw new ApiError(401, "Session expired");
  }
  return token;
}

export async function validateSession(): Promise<ValidateResponse> {
  return getJSON<ValidateResponse>("/v1/auth/validate");
}

export async function changePassword(
  userId: string,
  req: ChangePasswordRequest,
): Promise<void> {
  await putNoContent(`/v1/users/${userId}/password`, req);
}

export async function forgotPassword(req: ForgotPasswordRequest): Promise<void> {
  await postNoContent("/v1/auth/forgot-password", req);
}

export async function resetPassword(req: ResetPasswordRequest): Promise<void> {
  await postNoContent("/v1/auth/reset-password", req);
}
