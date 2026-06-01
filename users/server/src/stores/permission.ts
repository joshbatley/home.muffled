import type { Sql } from "../db/connection.ts";
import type { Permission } from "./role.ts";
import { ErrDuplicatePermission, ErrPermissionNotFound, mapPermission } from "./role.ts";

export async function createPermission(sql: Sql, key: string, description: string): Promise<Permission> {
  try {
    const rows = await sql`
      INSERT INTO permissions (key, description) VALUES (${key}, ${description})
      RETURNING id, key, description, created_at
    `;
    return mapPermission(rows[0] as Record<string, unknown>);
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505") {
      throw new Error(ErrDuplicatePermission);
    }
    throw e;
  }
}

export async function getPermissionById(sql: Sql, id: string): Promise<Permission | null> {
  const rows = await sql`
    SELECT id, key, description, created_at FROM permissions WHERE id = ${id}
  `;
  return rows.length ? mapPermission(rows[0] as Record<string, unknown>) : null;
}

export async function getPermissionByKey(sql: Sql, key: string): Promise<Permission | null> {
  const rows = await sql`
    SELECT id, key, description, created_at FROM permissions WHERE key = ${key}
  `;
  return rows.length ? mapPermission(rows[0] as Record<string, unknown>) : null;
}

export async function listPermissions(sql: Sql): Promise<Permission[]> {
  const rows = await sql`
    SELECT id, key, description, created_at FROM permissions ORDER BY key
  `;
  return rows.map((r) => mapPermission(r as Record<string, unknown>));
}

export async function deletePermission(sql: Sql, id: string): Promise<void> {
  const result = await sql`DELETE FROM permissions WHERE id = ${id}`;
  if (result.count === 0) throw new Error(ErrPermissionNotFound);
}
