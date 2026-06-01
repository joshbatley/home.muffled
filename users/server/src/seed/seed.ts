import { hashPassword } from "../auth/password.ts";
import type { Sql } from "../db/connection.ts";
import * as permStore from "../stores/permission.ts";
import * as roleStore from "../stores/role.ts";
import * as userStore from "../stores/user.ts";

export const PermIntranetRead = "intranet:read";
export const PermIntranetWrite = "intranet:write";
export const PermUsersAdmin = "users:admin";
export const RoleAdmin = "admin";
export const RoleUser = "user";
export const RoleReadonly = "readonly";

export async function seedDefaults(sql: Sql): Promise<void> {
  const keys = [
    { key: PermIntranetRead, desc: "Read intranet resources" },
    { key: PermIntranetWrite, desc: "Write intranet resources" },
    { key: PermUsersAdmin, desc: "Manage users, roles, and permissions" },
  ];

  const permIds = new Map<string, string>();
  for (const k of keys) {
    let p = await permStore.getPermissionByKey(sql, k.key);
    if (!p) {
      try {
        p = await permStore.createPermission(sql, k.key, k.desc);
      } catch (e) {
        if (e instanceof Error && e.message === roleStore.ErrDuplicatePermission) {
          p = await permStore.getPermissionByKey(sql, k.key);
        } else throw e;
      }
    }
    if (!p) throw new Error(`permission ${k.key}`);
    permIds.set(k.key, p.id);
  }

  const roles = [
    { name: RoleAdmin, keys: [PermIntranetRead, PermIntranetWrite, PermUsersAdmin] },
    { name: RoleUser, keys: [PermIntranetRead, PermIntranetWrite] },
    { name: RoleReadonly, keys: [PermIntranetRead] },
  ];

  for (const rs of roles) {
    let r = await roleStore.getRoleByName(sql, rs.name);
    if (!r) r = await roleStore.createRole(sql, rs.name);
    for (const pk of rs.keys) {
      await roleStore.assignPermission(sql, r.id, permIds.get(pk)!);
    }
  }
}

export async function seedAdmin(sql: Sql, email: string, password: string): Promise<void> {
  let u = await userStore.getUserByEmail(sql, email);
  if (!u) {
    const hash = await hashPassword(password);
    const id = crypto.randomUUID();
    u = {
      id,
      email,
      password_hash: hash,
      force_password_change: false,
      display_name: null,
      avatar_url: null,
      preferences: {},
      created_at: new Date(),
      updated_at: new Date(),
    };
    await userStore.createUser(sql, u);
  }

  const adminRole = await roleStore.getRoleByName(sql, RoleAdmin);
  if (!adminRole) throw new Error("admin role missing");
  await roleStore.assignRoleToUser(sql, u.id, adminRole.id);
}
