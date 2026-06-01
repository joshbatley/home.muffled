import type { Sql } from "../db/connection.ts";

export type RefreshToken = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
};

export async function createRefreshToken(
  sql: Sql,
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<RefreshToken> {
  const rows = await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt})
    RETURNING id, user_id, token_hash, expires_at, revoked, created_at
  `;
  return rows[0] as RefreshToken;
}

export async function getRefreshTokenByHash(sql: Sql, tokenHash: string): Promise<RefreshToken | null> {
  const rows = await sql`
    SELECT id, user_id, token_hash, expires_at, revoked, created_at
    FROM refresh_tokens WHERE token_hash = ${tokenHash}
  `;
  return rows.length ? (rows[0] as RefreshToken) : null;
}

export async function revokeRefreshToken(sql: Sql, id: string): Promise<void> {
  await sql`UPDATE refresh_tokens SET revoked = true WHERE id = ${id}`;
}
