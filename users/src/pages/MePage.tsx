import { useEffect, useState } from "react";
import { supabase, useSession } from "@home/auth";

export default function MePage() {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError("Failed to load profile.");
      } else {
        setDisplayName(data?.display_name ?? "");
        setError(null);
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">My profile</h1>

        {loading && <p className="text-sm text-gray-500">Loading profile...</p>}

        {error && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {user && !loading && !error && (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <dl className="divide-y divide-gray-100">
              <Row label="Email" value={user.email} />
              <Row label="Display name" value={displayName || "-"} />
              <Row label="ID" value={user.id} mono />
              <Row label="Roles" value={user.roles.length ? user.roles.join(", ") : "-"} />
              <Row
                label="Permissions"
                value={user.permissions.length ? user.permissions.join(", ") : "-"}
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
      <dd className={`text-sm text-gray-900 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
