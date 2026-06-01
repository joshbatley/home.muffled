import { hashPassword } from "../auth/password.ts";
import {
  PERM_INTRANET_READ,
  PERM_INTRANET_WRITE,
  PERM_USERS_ADMIN,
  ROLE_ADMIN,
  ROLE_READONLY,
  ROLE_USER,
} from "../constants.ts";
import type { Sql } from "../db/connection.ts";
import * as permStore from "../stores/permission.ts";
import * as roleStore from "../stores/role.ts";
import * as userStore from "../stores/user.ts";

export async function seedDefaults(sql: Sql): Promise<void> {
  const keys = [
    { key: PERM_INTRANET_READ, desc: "Read intranet resources" },
    { key: PERM_INTRANET_WRITE, desc: "Write intranet resources" },
    { key: PERM_USERS_ADMIN, desc: "Manage users, roles, and permissions" },
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
    { name: ROLE_ADMIN, keys: [PERM_INTRANET_READ, PERM_INTRANET_WRITE, PERM_USERS_ADMIN] },
    { name: ROLE_USER, keys: [PERM_INTRANET_READ, PERM_INTRANET_WRITE] },
    { name: ROLE_READONLY, keys: [PERM_INTRANET_READ] },
  ];

  for (const rs of roles) {
    let r = await roleStore.getRoleByName(sql, rs.name);
    if (!r) r = await roleStore.createRole(sql, rs.name);
    for (const pk of rs.keys) {
      await roleStore.assignPermission(sql, r.id, permIds.get(pk)!);
    }
  }
}

export async function seedAdmin(sql: Sql, email: string, password: string, bcryptCost: number): Promise<void> {
  let u = await userStore.getUserByEmail(sql, email);
  if (!u) {
    const hash = await hashPassword(password, bcryptCost);
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

  const adminRole = await roleStore.getRoleByName(sql, ROLE_ADMIN);
  if (!adminRole) throw new Error("admin role missing");
  await roleStore.assignRoleToUser(sql, u.id, adminRole.id);
}
