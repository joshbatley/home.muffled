import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@home/auth-ts";
import { Link } from "react-router-dom";
import { ApiError, apiJSON, postJSON } from "../api/client";

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
}

interface Role {
  id: string;
  name: string;
}

export default function UsersPage() {
  useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
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
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiJSON<UserRow[]>("/v1/users", { method: "GET" }),
        apiJSON<Role[]>("/v1/roles", { method: "GET" }),
      ]);
      setUsers(usersRes);
      setRoles(rolesRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreateUser(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await postJSON<{ id: string; email: string }>("/v1/users", {
        email,
        password,
        role_ids: roleIds,
      });
      setEmail("");
      setPassword("");
      setRoleIds([]);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create user");
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Temporary password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
            <h3 className="text-lg font-semibold text-gray-900">Users</h3>
          </div>

          {loading && <p className="px-6 py-4 text-sm text-gray-500">Loading users...</p>}

          {error && (
            <p className="m-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
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
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{u.email}</td>
                    <td className="px-6 py-4 text-gray-600">{u.display_name || "-"}</td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/users/${u.id}`}
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
