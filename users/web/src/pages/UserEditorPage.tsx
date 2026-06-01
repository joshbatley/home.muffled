import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ApiError,
  deleteNoContent,
  getJSON,
  postNoContent,
  putJSON,
  useAuth,
} from "@home/auth-ts";
import { fieldClassName } from "../components/field";
import type { Permission, Role, UserSummary } from "../types";

export default function UserEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshClaims } = useAuth();

  const [user, setUser] = useState<UserSummary | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [removeRoleId, setRemoveRoleId] = useState("");
  const [selectedPermissionId, setSelectedPermissionId] = useState("");
  const [revokePermissionId, setRevokePermissionId] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function loadData() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [userData, rolesData, permsData] = await Promise.all([
        getJSON<UserSummary>(`/v1/users/${id}`),
        getJSON<Role[]>("/v1/roles"),
        getJSON<Permission[]>("/v1/permissions"),
      ]);
      setUser(userData);
      setRoles(rolesData);
      setPermissions(permsData);
      setEmail(userData.email || "");
      setDisplayName(userData.display_name || "");
      setAvatarUrl(userData.avatar_url || "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [id]);

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setSubmitting(true);
    setStatus(null);
    setError(null);
    try {
      await putJSON<UserSummary>(`/v1/users/${id}`, {
        email,
        display_name: displayName,
        avatar_url: avatarUrl,
      });
      setStatus("Profile updated.");
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  }

  async function assignRole() {
    if (!id || !selectedRoleId) return;
    setStatus(null);
    setError(null);
    try {
      await postNoContent(`/v1/users/${id}/roles`, { role_ids: [selectedRoleId] });
      setStatus("Role assigned.");
      setSelectedRoleId("");
      await refreshClaims();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to assign role");
    }
  }

  async function removeRole() {
    if (!id || !removeRoleId) return;
    setStatus(null);
    setError(null);
    try {
      await deleteNoContent(`/v1/users/${id}/roles/${removeRoleId}`);
      setStatus("Role removed.");
      setRemoveRoleId("");
      await refreshClaims();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove role");
    }
  }

  async function grantPermission() {
    if (!id || !selectedPermissionId) return;
    setStatus(null);
    setError(null);
    try {
      await postNoContent(`/v1/users/${id}/permissions`, {
        permission_ids: [selectedPermissionId],
      });
      setStatus("Permission granted.");
      setSelectedPermissionId("");
      await refreshClaims();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to grant permission");
    }
  }

  async function revokePermission() {
    if (!id || !revokePermissionId) return;
    setStatus(null);
    setError(null);
    try {
      await deleteNoContent(`/v1/users/${id}/permissions/${revokePermissionId}`);
      setStatus("Permission revoked.");
      setRevokePermissionId("");
      await refreshClaims();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to revoke permission");
    }
  }

  if (!id) {
    return (
      <div className="p-8">
        <Link to="/users" className="text-sm text-gray-600 underline">
          Back to users
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Edit user</h1>
          <button
            className="text-sm text-gray-600 underline"
            onClick={() => navigate("/users")}
          >
            Back
          </button>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {status && <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">{status}</p>}

        {user && !loading && (
          <>
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Profile</h2>
              <form onSubmit={handleSaveProfile} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="profile-email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div>
                  <label htmlFor="profile-display-name" className="mb-1 block text-sm font-medium text-gray-700">Display name</label>
                  <input
                    id="profile-display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="profile-avatar-url" className="mb-1 block text-sm font-medium text-gray-700">Avatar URL</label>
                  <input
                    id="profile-avatar-url"
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    disabled={submitting}
                    className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Save profile"}
                  </button>
                </div>
              </form>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-gray-900">Roles</h2>
                <p className="mb-3 text-xs text-gray-500">Assign/remove by role ID.</p>

                <div className="mb-3 flex gap-2">
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
                  <button onClick={assignRole} className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white">
                    Add
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    placeholder="Role ID to remove"
                    value={removeRoleId}
                    onChange={(event) => setRemoveRoleId(event.target.value)}
                    className={fieldClassName}
                  />
                  <button onClick={removeRole} className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700">
                    Remove
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-gray-900">Direct permissions</h2>
                <p className="mb-3 text-xs text-gray-500">Grant/revoke by permission ID.</p>

                <div className="mb-3 flex gap-2">
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
                  <button onClick={grantPermission} className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white">
                    Add
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    placeholder="Permission ID to revoke"
                    value={revokePermissionId}
                    onChange={(event) => setRevokePermissionId(event.target.value)}
                    className={fieldClassName}
                  />
                  <button onClick={revokePermission} className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700">
                    Remove
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
