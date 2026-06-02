import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@home/auth";
import { adminCreateUser } from "../lib/adminCreateUser";
import { fieldClassName } from "../components/field";
import type { Role, UserSummary } from "../types";

export default function UsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    const [usersRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("id, email, display_name, avatar_url").order("email"),
      supabase.from("roles").select("id, name").order("name"),
    ]);

    if (usersRes.error || rolesRes.error) {
      setError(usersRes.error?.message ?? rolesRes.error?.message ?? "Failed to load users.");
      setLoading(false);
      return;
    }

    setUsers(
      (usersRes.data ?? []).map((row) => ({
        id: row.id,
        email: row.email,
        display_name: row.display_name ?? "",
        avatar_url: row.avatar_url ?? "",
      })),
    );
    setRoles(rolesRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreateUser(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await adminCreateUser({ email, password, role_ids: roleIds });
      setEmail("");
      setPassword("");
      setRoleIds([]);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleRole(id: string) {
    setRoleIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Create user</h2>
          <form onSubmit={handleCreateUser} className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="create-email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                id="create-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClassName}
              />
            </div>
            <div>
              <label htmlFor="create-password" className="mb-1 block text-sm font-medium text-gray-700">Temporary password</label>
              <input
                id="create-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClassName}
              />
            </div>

            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium text-gray-700">Assign roles</p>
              <div className="flex flex-wrap gap-3">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={roleIds.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create user"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          </div>

          {loading && <p className="px-6 py-4 text-sm text-gray-500">Loading users...</p>}

          {error && (
            <p className="m-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          {!loading && !error && (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Display name</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-gray-400">
                      No users found.
                    </td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 text-gray-600">{user.display_name || "-"}</td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/users/${user.id}`}
                        className="text-sm text-gray-700 underline hover:text-gray-900"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
