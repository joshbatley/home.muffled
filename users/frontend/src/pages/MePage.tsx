import { useEffect, useState } from "react";
import { ApiError, apiJSON } from "../api/client";
import { useShellAuth } from "../context/shellAuth";

interface MeData {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  roles: string[];
  permissions: string[];
  force_password_change: boolean;
}

export default function MePage() {
  const { user } = useShellAuth();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const data = await apiJSON<MeData>("/v1/me", { method: "GET" });
        setMe(data);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setError("Access blocked until password change is complete.");
        } else {
          setError("Failed to load profile.");
        }
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">My profile</h2>

        {loading && <p className="text-sm text-gray-500">Loading profile...</p>}

        {error && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {me && !loading && (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <dl className="divide-y divide-gray-100">
              <Row label="Email" value={me.email} />
              <Row label="Display name" value={me.display_name || "-"} />
              <Row label="ID" value={me.id} mono />
              <Row label="Roles" value={me.roles.length ? me.roles.join(", ") : "-"} />
              <Row
                label="Permissions"
                value={me.permissions.length ? me.permissions.join(", ") : "-"}
              />
            </dl>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start px-6 py-4">
      <dt className="w-40 shrink-0 text-sm font-medium text-gray-500">{label}</dt>
      <dd className={`text-sm text-gray-900 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
