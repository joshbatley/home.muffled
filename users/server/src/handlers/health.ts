import { Hono } from "hono";
import type { Sql } from "../db/connection.ts";
import { jsonError } from "../response.ts";

export function healthRoutes(sql: Sql) {
  const app = new Hono();

  app.get("/v1/health", (c) => c.json({ status: "ok" }));

  app.get("/v1/health/ready", async (c) => {
    try {
      await sql`SELECT 1`;
      return c.json({ status: "ready" });
    } catch {
      return jsonError(c, 503, "database unavailable");
    }
  });

  return app;
}
