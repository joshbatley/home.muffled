import type { Sql } from "../db/connection.ts";

export type Role = { id: string; name: string; created_at: Date };
export type Permission = { id: string; key: string; description: string; created_at: Date };

export const ErrRoleNotFound = "role not found";
export const ErrPermissionNotFound = "permission not found";
export const ErrDuplicateRole = "role already exists";
export const ErrDuplicatePermission = "permission key already exists";

export function mapRole(row: Record<string, unknown>): Role {
  return {
    id: String(row.id),
    name: String(row.name),
    created_at: row.created_at as Date,
  };
}

export function mapPermission(row: Record<string, unknown>): Permission {
  return {
    id: String(row.id),
    key: String(row.key),
    description: String(row.description),
    created_at: row.created_at as Date,
  };
}

export function roleNames(roles: Role[]): string[] {
  return roles.map((r) => r.name).sort();
}

export function permissionKeys(perms: Permission[]): string[] {
  return perms.map((p) => p.key).sort();
}

export async function createRole(sql: Sql, name: string): Promise<Role> {
  try {
    const rows = await sql`
      INSERT INTO roles (name) VALUES (${name}) RETURNING id, name, created_at
    `;
    return mapRole(rows[0] as Record<string, unknown>);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505") {
      throw new Error(ErrDuplicateRole);
    }
    throw e;
  }
}

export async function getRoleById(sql: Sql, id: string): Promise<Role | null> {
  const rows = await sql`SELECT id, name, created_at FROM roles WHERE id = ${id}`;
  return rows.length ? mapRole(rows[0] as Record<string, unknown>) : null;
}

export async function getRoleByName(sql: Sql, name: string): Promise<Role | null> {
  const rows = await sql`SELECT id, name, created_at FROM roles WHERE name = ${name}`;
  return rows.length ? mapRole(rows[0] as Record<string, unknown>) : null;
}

export async function listRoles(sql: Sql): Promise<Role[]> {
  const rows = await sql`SELECT id, name, created_at FROM roles ORDER BY name`;
  return rows.map((r) => mapRole(r as Record<string, unknown>));
}

export async function deleteRole(sql: Sql, id: string): Promise<void> {
  const result = await sql`DELETE FROM roles WHERE id = ${id}`;
  if (result.count === 0) throw new Error(ErrRoleNotFound);
}

export async function assignPermission(sql: Sql, roleId: string, permissionId: string): Promise<void> {
  await sql`
    INSERT INTO role_permissions (role_id, permission_id) VALUES (${roleId}, ${permissionId})
    ON CONFLICT DO NOTHING
  `;
}

export async function removePermission(sql: Sql, roleId: string, permissionId: string): Promise<void> {
  const result = await sql`
    DELETE FROM role_permissions WHERE role_id = ${roleId} AND permission_id = ${permissionId}
  `;
  if (result.count === 0) throw new Error(ErrRoleNotFound);
}

export async function assignRoleToUser(sql: Sql, userId: string, roleId: string): Promise<void> {
  await sql`
    INSERT INTO user_roles (user_id, role_id) VALUES (${userId}, ${roleId}) ON CONFLICT DO NOTHING
  `;
}

export async function removeRoleFromUser(sql: Sql, userId: string, roleId: string): Promise<void> {
  const result = await sql`DELETE FROM user_roles WHERE user_id = ${userId} AND role_id = ${roleId}`;
  if (result.count === 0) throw new Error(ErrRoleNotFound);
}

export async function getRolesByUserId(sql: Sql, userId: string): Promise<Role[]> {
  const rows = await sql`
    SELECT r.id, r.name, r.created_at FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ${userId} ORDER BY r.name
  `;
  return rows.map((r) => mapRole(r as Record<string, unknown>));
}

export async function getPermissionsByUserId(sql: Sql, userId: string): Promise<Permission[]> {
  const rows = await sql`
    SELECT id, key, description, created_at FROM (
      SELECT DISTINCT p.id, p.key, p.description, p.created_at
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ${userId}
      UNION
      SELECT DISTINCT p.id, p.key, p.description, p.created_at
      FROM permissions p
      JOIN user_permission_grants ug ON p.id = ug.permission_id
      WHERE ug.user_id = ${userId}
    ) x ORDER BY key
  `;
  return rows.map((r) => mapPermission(r as Record<string, unknown>));
}

export async function grantPermissionToUser(sql: Sql, userId: string, permissionId: string): Promise<void> {
  await sql`
    INSERT INTO user_permission_grants (user_id, permission_id) VALUES (${userId}, ${permissionId})
    ON CONFLICT DO NOTHING
  `;
}

export async function revokePermissionFromUser(sql: Sql, userId: string, permissionId: string): Promise<void> {
  const result = await sql`
    DELETE FROM user_permission_grants WHERE user_id = ${userId} AND permission_id = ${permissionId}
  `;
  if (result.count === 0) throw new Error(ErrRoleNotFound);
}
