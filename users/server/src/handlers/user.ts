import { Hono } from "hono";
import { hashPassword, comparePassword } from "../auth/password.ts";
import { isUuid, isValidEmail, MIN_PASSWORD_LENGTH } from "../constants.ts";
import type { Deps } from "../deps.ts";
import { welcomeIntranet } from "../mail/templates.ts";
import type { AppVariables } from "../middleware/auth.ts";
import { getClaims, isAdmin } from "../middleware/auth.ts";
import { jsonError } from "../response.ts";
import * as roleStore from "../stores/role.ts";
import * as userStore from "../stores/user.ts";

function isAdminOrSelf(claims: { user_id: string; roles: string[]; permissions: string[] }, userId: string) {
  return isAdmin(claims) || claims.user_id === userId;
}

function userResponse(u: userStore.User) {
  return {
    id: u.id,
    email: u.email,
    ...(u.display_name ? { display_name: u.display_name } : {}),
    ...(u.avatar_url ? { avatar_url: u.avatar_url } : {}),
  };
}

export function userSelfRoutes(deps: Deps) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/v1/me", async (c) => {
    const claims = getClaims(c)!;
    const u = await userStore.getUserById(deps.sql, claims.user_id);
    if (!u) return jsonError(c, 404, userStore.ErrUserNotFound);
    const roles = await roleStore.getRolesByUserId(deps.sql, u.id);
    const perms = await roleStore.getPermissionsByUserId(deps.sql, u.id);
    const prefs = u.preferences;
    const preferences =
      prefs && typeof prefs === "object" && Object.keys(prefs as object).length > 0 ? prefs : {};
    return c.json({
      id: u.id,
      email: u.email,
      ...(u.display_name ? { display_name: u.display_name } : {}),
      ...(u.avatar_url ? { avatar_url: u.avatar_url } : {}),
      preferences,
      force_password_change: u.force_password_change,
      roles: roleStore.roleNames(roles),
      permissions: roleStore.permissionKeys(perms),
    });
  });

  app.get("/v1/users/:id", async (c) => {
    const claims = getClaims(c)!;
    const id = c.req.param("id");
    if (!isAdminOrSelf(claims, id)) return jsonError(c, 403, "forbidden");
    const u = await userStore.getUserById(deps.sql, id);
    if (!u) return jsonError(c, 404, userStore.ErrUserNotFound);
    return c.json(userResponse(u));
  });

  app.put("/v1/users/:id", async (c) => {
    const claims = getClaims(c)!;
    const id = c.req.param("id");
    if (!isAdminOrSelf(claims, id)) return jsonError(c, 403, "forbidden");
    const body = await c.req.json<{
      email?: string;
      display_name?: string;
      avatar_url?: string;
      preferences?: unknown;
    }>().catch(() => null);
    if (!body) return jsonError(c, 400, "invalid request body");

    const u = await userStore.getUserById(deps.sql, id);
    if (!u) return jsonError(c, 404, userStore.ErrUserNotFound);
    if (body.email !== undefined) {
      if (!isValidEmail(body.email)) return jsonError(c, 400, "invalid email");
      u.email = body.email;
    }
    if (body.display_name !== undefined) u.display_name = body.display_name;
    if (body.avatar_url !== undefined) u.avatar_url = body.avatar_url;
    if (body.preferences !== undefined) u.preferences = body.preferences;
    try {
      await userStore.updateUser(deps.sql, u);
    } catch (e) {
      if (e instanceof Error && e.message === userStore.ErrDuplicateEmail) {
        return jsonError(c, 409, "email already exists");
      }
      return jsonError(c, 500, "failed to update user");
    }
    return c.json(userResponse(u));
  });

  app.put("/v1/users/:id/password", async (c) => {
    const claims = getClaims(c)!;
    const id = c.req.param("id");
    if (!isAdminOrSelf(claims, id)) return jsonError(c, 403, "forbidden");
    const body = await c.req.json<{ old_password?: string; new_password?: string }>().catch(() => null);
    if (!body) return jsonError(c, 400, "invalid request body");
    if ((body.new_password?.length ?? 0) < MIN_PASSWORD_LENGTH) return jsonError(c, 400, "password too short");

    const u = await userStore.getUserById(deps.sql, id);
    if (!u) return jsonError(c, 404, userStore.ErrUserNotFound);

    if (!isAdmin(claims) || claims.user_id === id) {
      if (!(await comparePassword(u.password_hash, body.old_password ?? ""))) {
        return jsonError(c, 401, "invalid old password");
      }
    }
    u.password_hash = await hashPassword(body.new_password!, deps.cfg.bcryptCost);
    u.force_password_change = false;
    try {
      await userStore.updateUser(deps.sql, u);
    } catch {
      return jsonError(c, 500, "failed to update password");
    }
    return c.body(null, 204);
  });

  return app;
}

export function userAdminRoutes(deps: Deps) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.get("/v1/users", async (c) => {
    const users = await userStore.listUsers(deps.sql);
    return c.json(users.map(userResponse));
  });

  app.post("/v1/users", async (c) => {
    const body = await c.req.json<{ email?: string; password?: string; role_ids?: string[] }>().catch(() => null);
    if (!body?.email || !body.password) return jsonError(c, 400, "valid email and password required");
    if (!isValidEmail(body.email)) return jsonError(c, 400, "invalid email");

    const hash = await hashPassword(body.password, deps.cfg.bcryptCost);
    const newUser: userStore.User = {
      id: crypto.randomUUID(),
      email: body.email,
      password_hash: hash,
      force_password_change: true,
      display_name: null,
      avatar_url: null,
      preferences: {},
      created_at: new Date(),
      updated_at: new Date(),
    };
    try {
      await userStore.createUser(deps.sql, newUser);
    } catch (e) {
      if (e instanceof Error && e.message === userStore.ErrDuplicateEmail) {
        return jsonError(c, 409, "email already exists");
      }
      return jsonError(c, 500, "failed to create user");
    }

    for (const rid of body.role_ids ?? []) {
      if (isUuid(rid)) {
        await roleStore.assignRoleToUser(deps.sql, newUser.id, rid).catch(() => {});
      }
    }

    if (deps.mailer.configured() && deps.cfg.publicBaseUrl) {
      const { subject, body: text } = welcomeIntranet(deps.intranetName, deps.cfg.publicBaseUrl);
      await deps.mailer.send([newUser.email], subject, text).catch(() => {});
    }

    return c.json({ id: newUser.id, email: newUser.email }, 201);
  });

  return app;
}
