import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ApiError,
  apiJSON,
  deleteNoContent,
  postNoContent,
  putJSON,
} from "../api/client";
import { useShellAuth } from "../context/shellAuth";

type UserData = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
};

type Role = { id: string; name: string };
type Permission = { id: string; key: string; description: string };

export default function UserEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshClaims } = useShellAuth();

  const [user, setUser] = useState<UserData | null>(null);
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
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [u, rs, ps] = await Promise.all([
        apiJSON<UserData>(`/v1/users/${id}`, { method: "GET" }),
        apiJSON<Role[]>("/v1/roles", { method: "GET" }),
        apiJSON<Permission[]>("/v1/permissions", { method: "GET" }),
      ]);
      setUser(u);
      setRoles(rs);
      setPermissions(ps);
      setEmail(u.email || "");
      setDisplayName(u.display_name || "");
      setAvatarUrl(u.avatar_url || "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setStatus(null);
    setError(null);
    try {
      await putJSON<UserData>(`/v1/users/${id}`, {
        email,
        display_name: displayName,
        avatar_url: avatarUrl,
      });
      setStatus("Profile updated.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update user");
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
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Display name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Avatar URL</label>
                  <input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">
                    Save profile
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
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                    onChange={(e) => setRemoveRoleId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                    onChange={(e) => setSelectedPermissionId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                    onChange={(e) => setRevokePermissionId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
