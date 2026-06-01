import type { Context, MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import type { Claims } from "../auth/token.ts";
import { validateAccessToken } from "../auth/token.ts";
import { PERM_USERS_ADMIN, ROLE_ADMIN } from "../constants.ts";
import { jsonError } from "../response.ts";

export type AppVariables = {
  claims: Claims;
  jwtSecret: string;
};

export function getClaims(c: Context<{ Variables: AppVariables }>): Claims | undefined {
  return c.get("claims");
}

export function isAdmin(claims: { roles: string[]; permissions: string[] }): boolean {
  return claims.roles.includes(ROLE_ADMIN) || claims.permissions.includes(PERM_USERS_ADMIN);
}

export function authMiddleware(secret: string): MiddlewareHandler<{ Variables: AppVariables }> {
  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return jsonError(c, 401, "missing authorization header");
    }
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return jsonError(c, 401, "invalid authorization header");
    }
    const claims = await validateAccessToken(secret, match[1]);
    if (!claims) {
      return jsonError(c, 401, "invalid token");
    }
    c.set("claims", claims);
    c.set("jwtSecret", secret);
    await next();
  });
}

export function adminMiddleware(): MiddlewareHandler<{ Variables: AppVariables }> {
  return createMiddleware(async (c, next) => {
    const claims = getClaims(c);
    if (!claims) return jsonError(c, 401, "unauthorized");
    if (isAdmin(claims)) {
      await next();
      return;
    }
    return jsonError(c, 403, "forbidden");
  });
}

export function forcePasswordChangeMiddleware(): MiddlewareHandler<{ Variables: AppVariables }> {
  return createMiddleware(async (c, next) => {
    const claims = getClaims(c);
    if (!claims) return jsonError(c, 401, "unauthorized");
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
    return jsonError(c, 403, "password change required");
  });
}
