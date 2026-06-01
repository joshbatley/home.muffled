import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@home/auth-ts";
import {
  ApiError,
  apiJSON,
  deleteNoContent,
  postJSON,
  postNoContent,
} from "../api/client";

type Role = { id: string; name: string };
type Permission = { id: string; key: string; description: string };

export default function RolesPermissionsPage() {
  const { refreshClaims } = useAuth();
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
    try {
      const [rolesData, permsData] = await Promise.all([
        apiJSON<Role[]>("/v1/roles", { method: "GET" }),
        apiJSON<Permission[]>("/v1/permissions", { method: "GET" }),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load RBAC data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createRole(event: FormEvent) {
    event.preventDefault();
    if (!roleName) return;
    setError(null);
    setStatus(null);
    try {
      await postJSON<Role>("/v1/roles", { name: roleName });
      setRoleName("");
      setStatus("Role created.");
      await loadData();
      await refreshClaims();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create role");
    }
  }

  async function deleteRole(id: string) {
    setError(null);
    setStatus(null);
    try {
      await deleteNoContent(`/v1/roles/${id}`);
      setStatus("Role deleted.");
      await loadData();
      await refreshClaims();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete role");
    }
  }

  async function createPermission(event: FormEvent) {
    event.preventDefault();
    if (!permissionKey) return;
    setError(null);
    setStatus(null);
    try {
      await postJSON<Permission>("/v1/permissions", {
        key: permissionKey,
        description: permissionDescription,
      });
      setPermissionKey("");
      setPermissionDescription("");
      setStatus("Permission created.");
      await loadData();
      await refreshClaims();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create permission");
    }
  }

  async function deletePermission(id: string) {
    setError(null);
    setStatus(null);
    try {
      await deleteNoContent(`/v1/permissions/${id}`);
      setStatus("Permission deleted.");
      await loadData();
      await refreshClaims();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete permission");
    }
  }

  async function assignPermissionToRole() {
    if (!selectedRoleId || !selectedPermissionId) return;
    setError(null);
    setStatus(null);
    try {
      await postNoContent(`/v1/roles/${selectedRoleId}/permissions`, {
        permission_ids: [selectedPermissionId],
      });
      setStatus("Permission assigned to role.");
      await refreshClaims();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to assign permission");
    }
  }

  async function removePermissionFromRole() {
    if (!selectedRoleId || !selectedPermissionId) return;
    setError(null);
    setStatus(null);
    try {
      await deleteNoContent(`/v1/roles/${selectedRoleId}/permissions/${selectedPermissionId}`);
      setStatus("Permission removed from role.");
      await refreshClaims();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove permission");
    }
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
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white">Create</button>
            </form>

            <div className="space-y-2">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm">
                  <span>{role.name}</span>
                  <button
                    onClick={() => void deleteRole(role.id)}
                    className="text-red-600 underline"
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
                onChange={(e) => setPermissionKey(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Description"
                value={permissionDescription}
                onChange={(e) => setPermissionDescription(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white">Create</button>
            </form>

            <div className="space-y-2">
              {permissions.map((permission) => (
                <div key={permission.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm">
                  <span>{permission.key}</span>
                  <button
                    onClick={() => void deletePermission(permission.id)}
                    className="text-red-600 underline"
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
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
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
              onChange={(e) => setSelectedPermissionId(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
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
              onClick={assignPermissionToRole}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white"
            >
              Assign permission
            </button>
            <button
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
