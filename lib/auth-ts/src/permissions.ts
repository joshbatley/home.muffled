import type { AuthUser } from "./authContext";

export function hasRole(user: AuthUser | null, role: string): boolean {
  if (!user) return false;
  return user.roles.includes(role);
}

export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: AuthUser | null, permissions: string[]): boolean {
  if (!user) return false;
  return permissions.some((permission) => user.permissions.includes(permission));
}
