import { Hono } from "hono";
import { comparePassword, comparePasswordDummy } from "../auth/password.ts";
import { generateRefreshToken, hashRefreshToken } from "../auth/refresh.ts";
import { issueAccessToken } from "../auth/token.ts";
import type { Deps } from "../deps.ts";
import type { AppVariables } from "../middleware/auth.ts";
import { getClaims } from "../middleware/auth.ts";
import { jsonError } from "../response.ts";
import * as refreshStore from "../stores/refreshToken.ts";
import * as roleStore from "../stores/role.ts";
import * as userStore from "../stores/user.ts";

async function issueTokens(deps: Deps, userId: string, email: string, forcePasswordChange: boolean) {
  const roles = await roleStore.getRolesByUserId(deps.sql, userId);
  const perms = await roleStore.getPermissionsByUserId(deps.sql, userId);
  const access = await issueAccessToken(
    deps.cfg.jwtSecret,
    userId,
    email,
    roleStore.roleNames(roles),
    roleStore.permissionKeys(perms),
    forcePasswordChange,
    deps.cfg.accessTokenTtlMs,
  );
  const rawRefresh = generateRefreshToken();
  const hash = hashRefreshToken(rawRefresh);
  const expires = new Date(Date.now() + deps.cfg.refreshTokenTtlMs);
  await refreshStore.createRefreshToken(deps.sql, userId, hash, expires);
  return { access, refresh: rawRefresh, forcePasswordChange };
}

export function authRoutes(deps: Deps) {
  const app = new Hono();

  app.post("/v1/auth/login", async (c) => {
    const body = await c.req.json<{ email?: string; password?: string }>().catch(() => null);
    if (!body) return jsonError(c, 400, "invalid request body");
    const u = await userStore.getUserByEmail(deps.sql, body.email ?? "");
    if (!u) {
      await comparePasswordDummy(body.password ?? "", deps.cfg.bcryptCost);
      return jsonError(c, 401, "invalid credentials");
    }
    if (!(await comparePassword(u.password_hash, body.password ?? ""))) {
      return jsonError(c, 401, "invalid credentials");
    }
    try {
      const tokens = await issueTokens(deps, u.id, u.email, u.force_password_change);
      return c.json({
        access_token: tokens.access,
        refresh_token: tokens.refresh,
        force_password_change: tokens.forcePasswordChange,
      });
    } catch {
      return jsonError(c, 500, "failed to issue token");
    }
  });

  app.post("/v1/auth/refresh", async (c) => {
    const body = await c.req.json<{ refresh_token?: string }>().catch(() => null);
    if (!body) return jsonError(c, 400, "invalid request body");
    const hash = hashRefreshToken(body.refresh_token ?? "");
    const rt = await refreshStore.getRefreshTokenByHash(deps.sql, hash);
    if (!rt || rt.revoked || new Date(rt.expires_at) < new Date()) {
      return jsonError(c, 401, "invalid refresh token");
    }
    const u = await userStore.getUserById(deps.sql, rt.user_id);
    if (!u) return jsonError(c, 401, "invalid refresh token");
    await refreshStore.revokeRefreshToken(deps.sql, rt.id);
    try {
      const tokens = await issueTokens(deps, u.id, u.email, u.force_password_change);
      return c.json({
        access_token: tokens.access,
        refresh_token: tokens.refresh,
        force_password_change: tokens.forcePasswordChange,
      });
    } catch {
      return jsonError(c, 500, "failed to issue token");
    }
  });

  app.post("/v1/auth/logout", async (c) => {
    const body = await c.req.json<{ refresh_token?: string }>().catch(() => null);
    if (body?.refresh_token) {
      const hash = hashRefreshToken(body.refresh_token);
      const rt = await refreshStore.getRefreshTokenByHash(deps.sql, hash);
      if (rt) await refreshStore.revokeRefreshToken(deps.sql, rt.id);
    }
    return c.body(null, 204);
  });

  return app;
}

export function authProtectedRoutes(deps: Deps) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/v1/auth/validate", (c) => {
    const claims = getClaims(c);
    if (!claims) return jsonError(c, 401, "unauthorized");
    return c.json({
      user_id: claims.user_id,
      email: claims.email,
      roles: claims.roles,
      permissions: claims.permissions,
      force_password_change: claims.force_password_change,
      exp: claims.exp ?? 0,
    });
  });

  return app;
}
