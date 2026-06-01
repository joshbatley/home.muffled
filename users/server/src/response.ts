import type { Context } from "hono";

export function jsonError(c: Context, status: number, msg: string) {
  return c.json({ error: msg }, status);
}
