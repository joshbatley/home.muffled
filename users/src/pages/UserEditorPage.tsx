import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase, useSession } from "@home/auth";
import { fieldClassName } from "../components/field";
import type { Permission, Role, UserSummary } from "../types";

export default function UserEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshUser } = useSession();

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

    const [userRes, rolesRes, permsRes] = await Promise.all([
      supabase.from("profiles").select("id, email, display_name, avatar_url").eq("id", id).single(),
      supabase.from("roles").select("id, name").order("name"),
      supabase.from("permissions").select("id, key, description").order("key"),
    ]);

    if (userRes.error) {
      setError(userRes.error.message);
      setLoading(false);
      return;
    }

    const row = userRes.data;
    setUser({
      id: row.id,
      email: row.email,
      display_name: row.display_name ?? "",
      avatar_url: row.avatar_url ?? "",
    });
    setEmail(row.email);
    setDisplayName(row.display_name ?? "");
    setAvatarUrl(row.avatar_url ?? "");
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
  }, [id]);

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setSubmitting(true);
    setStatus(null);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        email,
        display_name: displayName,
        avatar_url: avatarUrl,
      })
      .eq("id", id);

    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStatus("Profile updated.");
    await loadData();
  }

  async function assignRole() {
    if (!id || !selectedRoleId) return;
    setStatus(null);
    setError(null);
    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({ user_id: id, role_id: selectedRoleId });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setStatus("Role assigned.");
    setSelectedRoleId("");
    await refreshUser();
  }

  async function removeRole() {
    if (!id || !removeRoleId) return;
    setStatus(null);
    setError(null);
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", id)
      .eq("role_id", removeRoleId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setStatus("Role removed.");
    setRemoveRoleId("");
    await refreshUser();
  }

  async function grantPermission() {
    if (!id || !selectedPermissionId) return;
    setStatus(null);
    setError(null);
    const { error: insertError } = await supabase
      .from("user_permission_grants")
      .insert({ user_id: id, permission_id: selectedPermissionId });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setStatus("Permission granted.");
    setSelectedPermissionId("");
    await refreshUser();
  }

  async function revokePermission() {
    if (!id || !revokePermissionId) return;
    setStatus(null);
    setError(null);
    const { error: deleteError } = await supabase
      .from("user_permission_grants")
      .delete()
      .eq("user_id", id)
      .eq("permission_id", revokePermissionId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setStatus("Permission revoked.");
    setRevokePermissionId("");
    await refreshUser();
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
                  <button type="button" onClick={assignRole} className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white">
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
                  <button type="button" onClick={removeRole} className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700">
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
                  <button type="button" onClick={grantPermission} className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white">
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
                  <button type="button" onClick={revokePermission} className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700">
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
