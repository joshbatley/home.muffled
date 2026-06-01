import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

export function corsMiddleware(allowedOrigins: string[]): MiddlewareHandler {
  return createMiddleware(async (c, next) => {
    const origin = c.req.header("Origin");
    const allowed = !!origin && allowedOrigins.includes(origin);
    if (allowed) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      c.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
    }
    if (c.req.method === "OPTIONS") {
      return c.body(null, allowed ? 204 : 403);
    }
    await next();
  });
}
