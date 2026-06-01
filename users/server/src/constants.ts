export const ROLE_ADMIN = "admin";
export const ROLE_USER = "user";
export const ROLE_READONLY = "readonly";

export const PERM_USERS_ADMIN = "users:admin";
export const PERM_INTRANET_READ = "intranet:read";
export const PERM_INTRANET_WRITE = "intranet:write";

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f-]{36}$/i;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
