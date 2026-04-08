import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, putNoContent } from "../api/client";
import { useAuth } from "../context/auth";

export default function ChangePasswordPage() {
  const { user, logout, refreshClaims, setForcePasswordChanged } = useAuth();
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;
  const userId = user.id;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await putNoContent(`/v1/users/${userId}/password`, {
        old_password: oldPassword,
        new_password: newPassword,
      });
      setForcePasswordChanged();
      await refreshClaims();
      navigate("/me", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Change password</h1>
        <p className="mb-6 text-sm text-amber-700">Password change is required before continuing.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="old-password" className="mb-1 block text-sm font-medium text-gray-700">
              Current password
            </label>
            <input
              id="old-password"
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              minLength={8}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
            />
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void logout()}
          className="mt-4 w-full text-sm text-gray-600 hover:text-gray-900"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
