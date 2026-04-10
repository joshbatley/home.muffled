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
export declare class ApiError extends Error {
    status: number;
    constructor(status: number, message: string);
}
export declare function setAccessToken(token: string | null): void;
export declare function setLogoutHandler(fn: () => void): void;
export declare function hasAccessToken(): boolean;
export declare function getStoredRefreshToken(): string | null;
export declare function storeRefreshToken(token: string): void;
export declare function clearRefreshToken(): void;
export declare function apiFetch(input: string, init?: RequestInit): Promise<Response>;
export declare function apiFetchOrThrow(input: string, init?: RequestInit): Promise<Response>;
export declare function apiJSON<T>(input: string, init?: RequestInit): Promise<T>;
export declare function loginRequest(email: string, password: string): Promise<TokenResponse>;
export declare function logoutRequest(): Promise<void>;
export declare function refreshSessionOrThrow(): Promise<string>;
export declare function validateSession(): Promise<ValidateResponse>;
export declare function postJSON<T>(input: string, body: unknown): Promise<T>;
export declare function putJSON<T>(input: string, body: unknown): Promise<T>;
export declare function postNoContent(input: string, body: unknown): Promise<void>;
export declare function putNoContent(input: string, body: unknown): Promise<void>;
export declare function deleteNoContent(input: string): Promise<void>;
export {};
