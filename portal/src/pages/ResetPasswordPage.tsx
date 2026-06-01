import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, resetPassword } from "@home/auth-ts";
import Input from "../components/Input";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      await resetPassword({ token, new_password: newPassword });
      setStatus("Password reset complete. You can now sign in.");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Set new password</h1>
        <p className="mb-6 text-sm text-gray-500">Reset token is read from the URL query.</p>

        {!token && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Missing token. Open the reset link from your email.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-700">
              New password
            </label>
            <Input
              id="new-password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          {status && <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{status}</p>}
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !token}
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Reset password"}
          </button>
        </form>

        <Link to="/login" className="mt-4 block text-center text-sm text-gray-600 hover:text-gray-900">
          Back to login
        </Link>
      </div>
    </div>
  );
}
