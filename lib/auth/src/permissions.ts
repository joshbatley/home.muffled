import type { AppUser } from "./types";

export function hasRole(user: AppUser | null, role: string): boolean {
  if (!user) return false;
  return user.roles.includes(role);
}

export function hasPermission(user: AppUser | null, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: AppUser | null, permissions: string[]): boolean {
  if (!user) return false;
  return permissions.some((p) => user.permissions.includes(p));
}
