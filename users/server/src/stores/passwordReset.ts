import type { Sql } from "../db/connection.ts";

export type PasswordResetToken = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
};

export const ErrResetTokenNotFound = "password reset token not found";

export async function createPasswordResetToken(
  sql: Sql,
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await sql`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (${userId}, ${tokenHash}, ${expiresAt})
  `;
}

export async function getValidPasswordResetByHash(sql: Sql, tokenHash: string): Promise<PasswordResetToken | null> {
  const rows = await sql`
    SELECT id, user_id, token_hash, expires_at, used_at, created_at
    FROM password_reset_tokens
    WHERE token_hash = ${tokenHash} AND used_at IS NULL AND expires_at > now()
  `;
  return rows.length ? (rows[0] as PasswordResetToken) : null;
}

export async function markPasswordResetUsed(sql: Sql, id: string): Promise<void> {
  await sql`UPDATE password_reset_tokens SET used_at = now() WHERE id = ${id}`;
}
