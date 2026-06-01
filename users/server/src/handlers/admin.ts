import { Hono } from "hono";
import { isUuid } from "../constants.ts";
import type { Deps } from "../deps.ts";
import { jsonError } from "../response.ts";
import * as permStore from "../stores/permission.ts";
import * as roleStore from "../stores/role.ts";

export function adminRoutes(deps: Deps) {
  const { sql } = deps;
  const app = new Hono();

  app.post("/v1/roles", async (c) => {
    const body = await c.req.json<{ name?: string }>().catch(() => null);
    if (!body) return jsonError(c, 400, "invalid request body");
    if (!body.name) return jsonError(c, 400, "name required");
    try {
      const created = await roleStore.createRole(sql, body.name);
      return c.json({ id: created.id, name: created.name }, 201);
    } catch (e) {
      if (e instanceof Error && e.message === roleStore.ErrDuplicateRole) {
        return jsonError(c, 409, "role already exists");
      }
      return jsonError(c, 500, "failed to create role");
    }
  });

  app.get("/v1/roles", async (c) => {
    const roles = await roleStore.listRoles(sql);
    return c.json(roles.map((r) => ({ id: r.id, name: r.name })));
  });

  app.delete("/v1/roles/:id", async (c) => {
    try {
      await roleStore.deleteRole(sql, c.req.param("id"));
      return c.body(null, 204);
    } catch (e) {
      if (e instanceof Error && e.message === roleStore.ErrRoleNotFound) {
        return jsonError(c, 404, roleStore.ErrRoleNotFound);
      }
      return jsonError(c, 500, "failed to delete role");
    }
  });

  app.post("/v1/roles/:id/permissions", async (c) => {
    const body = await c.req.json<{ permission_ids?: string[] }>().catch(() => null);
    if (!body) return jsonError(c, 400, "invalid request body");
    const roleId = c.req.param("id");
    for (const pid of body.permission_ids ?? []) {
      if (!isUuid(pid)) return jsonError(c, 400, "invalid permission id");
      try {
        await roleStore.assignPermission(sql, roleId, pid);
      } catch {
        return jsonError(c, 500, "failed to assign permission");
      }
    }
    return c.body(null, 204);
  });

  app.delete("/v1/roles/:id/permissions/:permId", async (c) => {
    try {
      await roleStore.removePermission(sql, c.req.param("id"), c.req.param("permId"));
      return c.body(null, 204);
    } catch (e) {
      if (e instanceof Error && e.message === roleStore.ErrRoleNotFound) {
        return jsonError(c, 404, roleStore.ErrRoleNotFound);
      }
      return jsonError(c, 500, "failed to remove permission");
    }
  });

  app.post("/v1/permissions", async (c) => {
    const body = await c.req.json<{ key?: string; description?: string }>().catch(() => null);
    if (!body) return jsonError(c, 400, "invalid request body");
    if (!body.key) return jsonError(c, 400, "key required");
    try {
      const created = await permStore.createPermission(sql, body.key, body.description ?? "");
      return c.json({ id: created.id, key: created.key, description: created.description }, 201);
    } catch (e) {
      if (e instanceof Error && e.message === roleStore.ErrDuplicatePermission) {
        return jsonError(c, 409, "permission key already exists");
      }
      return jsonError(c, 500, "failed to create permission");
    }
  });

  app.get("/v1/permissions", async (c) => {
    const perms = await permStore.listPermissions(sql);
    return c.json(perms.map((p) => ({ id: p.id, key: p.key, description: p.description })));
  });

  app.delete("/v1/permissions/:id", async (c) => {
    try {
      await permStore.deletePermission(sql, c.req.param("id"));
      return c.body(null, 204);
    } catch (e) {
      if (e instanceof Error && e.message === roleStore.ErrPermissionNotFound) {
        return jsonError(c, 404, roleStore.ErrPermissionNotFound);
      }
      return jsonError(c, 500, "failed to delete permission");
    }
  });

  app.post("/v1/users/:id/roles", async (c) => {
    const body = await c.req.json<{ role_ids?: string[] }>().catch(() => null);
    if (!body) return jsonError(c, 400, "invalid request body");
    const userId = c.req.param("id");
    for (const rid of body.role_ids ?? []) {
      if (!isUuid(rid)) return jsonError(c, 400, "invalid role id");
      try {
        await roleStore.assignRoleToUser(sql, userId, rid);
      } catch {
        return jsonError(c, 500, "failed to assign role");
      }
    }
    return c.body(null, 204);
  });

  app.delete("/v1/users/:id/roles/:roleId", async (c) => {
    try {
      await roleStore.removeRoleFromUser(sql, c.req.param("id"), c.req.param("roleId"));
      return c.body(null, 204);
    } catch (e) {
      if (e instanceof Error && e.message === roleStore.ErrRoleNotFound) {
        return jsonError(c, 404, roleStore.ErrRoleNotFound);
      }
      return jsonError(c, 500, "failed to remove role");
    }
  });

  app.post("/v1/users/:id/permissions", async (c) => {
    const body = await c.req.json<{ permission_ids?: string[] }>().catch(() => null);
    if (!body) return jsonError(c, 400, "invalid request body");
    const userId = c.req.param("id");
    for (const pid of body.permission_ids ?? []) {
      if (!isUuid(pid)) return jsonError(c, 400, "invalid permission id");
      try {
        await roleStore.grantPermissionToUser(sql, userId, pid);
      } catch {
        return jsonError(c, 500, "failed to grant permission");
      }
    }
    return c.body(null, 204);
  });

  app.delete("/v1/users/:id/permissions/:permId", async (c) => {
    try {
      await roleStore.revokePermissionFromUser(sql, c.req.param("id"), c.req.param("permId"));
      return c.body(null, 204);
    } catch (e) {
      if (e instanceof Error && e.message === roleStore.ErrRoleNotFound) {
        return jsonError(c, 404, roleStore.ErrRoleNotFound);
      }
      return jsonError(c, 500, "failed to revoke permission");
    }
  });

  return app;
}
