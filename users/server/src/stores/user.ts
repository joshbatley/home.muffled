import type { Sql } from "../db/connection.ts";

export type User = {
  id: string;
  email: string;
  password_hash: string;
  force_password_change: boolean;
  display_name: string | null;
  avatar_url: string | null;
  preferences: unknown;
  created_at: Date;
  updated_at: Date;
};

export const ErrUserNotFound = "user not found";
export const ErrDuplicateEmail = "email already exists";

function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email),
    password_hash: String(row.password_hash),
    force_password_change: Boolean(row.force_password_change),
    display_name: row.display_name != null ? String(row.display_name) : null,
    avatar_url: row.avatar_url != null ? String(row.avatar_url) : null,
    preferences: row.preferences ?? {},
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

export async function createUser(sql: Sql, u: User): Promise<void> {
  const prefs = u.preferences ?? {};
  try {
    await sql`
      INSERT INTO users (id, email, password_hash, force_password_change, display_name, avatar_url, preferences)
      VALUES (${u.id}, ${u.email}, ${u.password_hash}, ${u.force_password_change}, ${u.display_name}, ${u.avatar_url}, ${sql.json(prefs)})
    `;
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505") {
      throw new Error(ErrDuplicateEmail);
    }
    throw e;
  }
}

export async function getUserById(sql: Sql, id: string): Promise<User | null> {
  const rows = await sql`
    SELECT id, email, password_hash, force_password_change, display_name, avatar_url, preferences, created_at, updated_at
    FROM users WHERE id = ${id}
  `;
  if (!rows.length) return null;
  return mapUser(rows[0] as Record<string, unknown>);
}

export async function getUserByEmail(sql: Sql, email: string): Promise<User | null> {
  const rows = await sql`
    SELECT id, email, password_hash, force_password_change, display_name, avatar_url, preferences, created_at, updated_at
    FROM users WHERE lower(email) = lower(${email})
  `;
  if (!rows.length) return null;
  return mapUser(rows[0] as Record<string, unknown>);
}

export async function listUsers(sql: Sql): Promise<User[]> {
  const rows = await sql`
    SELECT id, email, password_hash, force_password_change, display_name, avatar_url, preferences, created_at, updated_at
    FROM users ORDER BY email
  `;
  return rows.map((r) => mapUser(r as Record<string, unknown>));
}

export async function updateUser(sql: Sql, u: User): Promise<void> {
  const prefs = u.preferences ?? {};
  const result = await sql`
    UPDATE users SET email = ${u.email}, password_hash = ${u.password_hash}, force_password_change = ${u.force_password_change},
      display_name = ${u.display_name}, avatar_url = ${u.avatar_url}, preferences = ${sql.json(prefs)}, updated_at = ${new Date()}
    WHERE id = ${u.id}
  `;
  if (result.count === 0) throw new Error(ErrUserNotFound);
}
