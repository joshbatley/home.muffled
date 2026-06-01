import type { MiddlewareHandler } from "hono";

export function corsMiddleware(allowedOrigins: string[]): MiddlewareHandler {
  return async (c, next) => {
    const origin = c.req.header("Origin");
    if (origin && allowedOrigins.includes(origin)) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      c.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
    }
    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }
    await next();
  };
}
