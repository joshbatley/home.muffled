import { FormEvent, useEffect, useState } from "react";
import { supabase, useSession } from "@home/auth";
import { fieldClassName } from "../components/field";
import type { Permission, Role } from "../types";

export default function RolesPermissionsPage() {
  const { refreshUser } = useSession();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [roleName, setRoleName] = useState("");
  const [permissionKey, setPermissionKey] = useState("");
  const [permissionDescription, setPermissionDescription] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedPermissionId, setSelectedPermissionId] = useState("");

  async function loadData() {
    setLoading(true);
    setError(null);
    const [rolesRes, permsRes] = await Promise.all([
      supabase.from("roles").select("id, name").order("name"),
      supabase.from("permissions").select("id, key, description").order("key"),
    ]);

    if (rolesRes.error || permsRes.error) {
      setError(rolesRes.error?.message ?? permsRes.error?.message ?? "Failed to load RBAC data");
      setLoading(false);
      return;
    }

    setRoles(rolesRes.data ?? []);
    setPermissions(
      (permsRes.data ?? []).map((p) => ({
        id: p.id,
        key: p.key,
        description: p.description ?? "",
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createRole(event: FormEvent) {
    event.preventDefault();
    if (!roleName) return;
    setError(null);
    setStatus(null);
    const { error: insertError } = await supabase.from("roles").insert({ name: roleName });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setRoleName("");
    setStatus("Role created.");
    await loadData();
    await refreshUser();
  }

  async function deleteRole(id: string) {
    setError(null);
    setStatus(null);
    const { error: deleteError } = await supabase.from("roles").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setStatus("Role deleted.");
    await loadData();
    await refreshUser();
  }

  async function createPermission(event: FormEvent) {
    event.preventDefault();
    if (!permissionKey) return;
    setError(null);
    setStatus(null);
    const { error: insertError } = await supabase.from("permissions").insert({
      key: permissionKey,
      description: permissionDescription,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setPermissionKey("");
    setPermissionDescription("");
    setStatus("Permission created.");
    await loadData();
    await refreshUser();
  }

  async function deletePermission(id: string) {
    setError(null);
    setStatus(null);
    const { error: deleteError } = await supabase.from("permissions").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setStatus("Permission deleted.");
    await loadData();
    await refreshUser();
  }

  async function assignPermissionToRole() {
    if (!selectedRoleId || !selectedPermissionId) return;
    setError(null);
    setStatus(null);
    const { error: insertError } = await supabase.from("role_permissions").insert({
      role_id: selectedRoleId,
      permission_id: selectedPermissionId,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setStatus("Permission assigned to role.");
    await refreshUser();
  }

  async function removePermissionFromRole() {
    if (!selectedRoleId || !selectedPermissionId) return;
    setError(null);
    setStatus(null);
    const { error: deleteError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", selectedRoleId)
      .eq("permission_id", selectedPermissionId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setStatus("Permission removed from role.");
    await refreshUser();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <h1 className="text-xl font-semibold text-gray-900">Roles & Permissions</h1>

        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {status && <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{status}</p>}

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Roles</h2>
            <form onSubmit={createRole} className="mb-4 flex gap-2">
              <input
                placeholder="Role name"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                className={fieldClassName}
              />
              <button className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white">Create</button>
            </form>

            <div className="space-y-2">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm">
                  <span>{role.name}</span>
                  <button
                    type="button"
                    onClick={() => void deleteRole(role.id)}
                    className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Permissions</h2>
            <form onSubmit={createPermission} className="mb-4 space-y-2">
              <input
                placeholder="Permission key (e.g. users:admin)"
                value={permissionKey}
                onChange={(event) => setPermissionKey(event.target.value)}
                className={fieldClassName}
              />
              <input
                placeholder="Description"
                value={permissionDescription}
                onChange={(event) => setPermissionDescription(event.target.value)}
                className={fieldClassName}
              />
              <button className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white">Create</button>
            </form>

            <div className="space-y-2">
              {permissions.map((permission) => (
                <div key={permission.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm">
                  <span>{permission.key}</span>
                  <button
                    type="button"
                    onClick={() => void deletePermission(permission.id)}
                    className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Role permission assignment</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <select
              value={selectedRoleId}
              onChange={(event) => setSelectedRoleId(event.target.value)}
              className={fieldClassName}
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} ({role.id})
                </option>
              ))}
            </select>

            <select
              value={selectedPermissionId}
              onChange={(event) => setSelectedPermissionId(event.target.value)}
              className={fieldClassName}
            >
              <option value="">Select permission</option>
              {permissions.map((permission) => (
                <option key={permission.id} value={permission.id}>
                  {permission.key} ({permission.id})
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={assignPermissionToRole}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white"
            >
              Assign permission
            </button>
            <button
              type="button"
              onClick={removePermissionFromRole}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700"
            >
              Remove permission
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
