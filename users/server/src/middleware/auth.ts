import type { Context, MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import type { Claims } from "../auth/token.ts";
import { validateAccessToken } from "../auth/token.ts";

export const PERM_USERS_ADMIN = "users:admin";

export type AppVariables = {
  claims: Claims;
  jwtSecret: string;
};

export function getClaims(c: Context<{ Variables: AppVariables }>): Claims | undefined {
  return c.get("claims");
}

export function authMiddleware(secret: string): MiddlewareHandler<{ Variables: AppVariables }> {
  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.text("missing authorization header", 401);
    }
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return c.text("invalid authorization header", 401);
    }
    const claims = await validateAccessToken(secret, match[1]);
    if (!claims) {
      return c.text("invalid token", 401);
    }
    c.set("claims", claims);
    c.set("jwtSecret", secret);
    await next();
  });
}

export function adminMiddleware(): MiddlewareHandler<{ Variables: AppVariables }> {
  return createMiddleware(async (c, next) => {
    const claims = getClaims(c);
    if (!claims) return c.text("unauthorized", 401);
    if (claims.roles.includes("admin") || claims.permissions.includes(PERM_USERS_ADMIN)) {
      await next();
      return;
    }
    return c.text("forbidden", 403);
  });
}

export function forcePasswordChangeMiddleware(): MiddlewareHandler<{ Variables: AppVariables }> {
  return createMiddleware(async (c, next) => {
    const claims = getClaims(c);
    if (!claims) return c.text("unauthorized", 401);
    if (!claims.force_password_change) {
      await next();
      return;
    }
    const path = c.req.path;
    const method = c.req.method;
    const id = c.req.param("id") || path.match(/\/v1\/users\/([^/]+)\/password$/)?.[1];
    if (method === "PUT" && path.endsWith("/password") && id === claims.user_id) {
      await next();
      return;
    }
    return c.text("password change required", 403);
  });
}
