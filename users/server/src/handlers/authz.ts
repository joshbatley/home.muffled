import { Hono } from "hono";
import type { Sql } from "../db/connection.ts";
import type { AppVariables } from "../middleware/auth.ts";
import { getClaims } from "../middleware/auth.ts";
import { jsonError } from "../response.ts";
import * as roleStore from "../stores/role.ts";

export function authzRoutes(sql: Sql) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.post("/v1/authz/check", async (c) => {
    const claims = getClaims(c);
    if (!claims) return jsonError(c, 401, "unauthorized");
    const body = await c.req.json<{ permission?: string }>().catch(() => null);
    if (!body) return jsonError(c, 400, "invalid request body");
    if (!body.permission) {
      return c.json({ allowed: false, reason: "permission key required" });
    }

    const roles = await roleStore.getRolesByUserId(sql, claims.user_id);
    for (const ro of roles) {
      if (ro.name === "admin") return c.json({ allowed: true, reason: "admin" });
    }
    const perms = await roleStore.getPermissionsByUserId(sql, claims.user_id);
    const allowed = perms.some((p) => p.key === body.permission);
    return c.json({ allowed });
  });

  return app;
}
