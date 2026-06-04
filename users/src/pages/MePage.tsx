import { useEffect, useState } from "react";
import { supabase, useSession } from "@home/auth";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 font-mono text-xl font-normal text-foreground">my profile</h1>

        {loading && <p className="text-sm text-muted-foreground">Loading profile...</p>}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {user && !loading && !error && (
          <Card>
            <CardContent className="p-0">
              <dl className="divide-y divide-border-faint">
                <Row label="email" value={user.email} />
                <Row label="display name" value={displayName || "-"} />
                <Row label="id" value={user.id} mono />
                <Row label="roles" value={user.roles.length ? user.roles.join(", ") : "-"} />
                <Row
                  label="permissions"
                  value={user.permissions.length ? user.permissions.join(", ") : "-"}
                />
              </dl>
            </CardContent>
          </Card>
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
      <dt className="w-40 shrink-0 font-mono text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm text-foreground ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
