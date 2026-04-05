import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/auth";

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
}

export default function UsersPage() {
  const { logout } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/v1/users")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setUsers)
      .catch(() => setError("Failed to load users."));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="font-semibold text-gray-900">home.muffled</span>
          <div className="flex items-center gap-4">
            <Link to="/me" className="text-sm text-gray-500 hover:text-gray-900">
              Profile
            </Link>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">Users</h2>

        {error && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {!error && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">
                    Display name
                  </th>
                  <th className="px-6 py-3 text-left font-mono font-medium text-gray-500">
                    ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-6 text-center text-gray-400"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{u.email}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {u.display_name || "—"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">
                      {u.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
