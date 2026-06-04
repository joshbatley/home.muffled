import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@home/auth";
import { adminCreateUser } from "../lib/adminCreateUser";
import type { Role, UserSummary } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>create user</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-email">email</Label>
                <Input
                  id="create-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">temporary password</Label>
                <Input
                  id="create-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <p className="mb-2 font-mono text-xs text-muted-foreground">assign roles</p>
                <div className="flex flex-wrap gap-4">
                  {roles.map((role) => (
                    <Label key={role.id} className="flex items-center gap-2 font-sans normal-case">
                      <Checkbox
                        checked={roleIds.includes(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      {role.name}
                    </Label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "creating..." : "create user"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden p-0">
          <CardHeader className="border-b border-border">
            <CardTitle>users</CardTitle>
          </CardHeader>

          {loading && <p className="px-6 py-4 text-sm text-muted-foreground">Loading users...</p>}

          {error && <p className="m-6 text-sm text-destructive">{error}</p>}

          {!loading && !error && (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-6 py-3 text-left font-mono text-xs font-normal text-muted-foreground">
                    email
                  </th>
                  <th className="px-6 py-3 text-left font-mono text-xs font-normal text-muted-foreground">
                    display name
                  </th>
                  <th className="px-6 py-3 text-left font-mono text-xs font-normal text-muted-foreground">
                    action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-faint">
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user.id} className="transition-opacity hover:opacity-60">
                    <td className="px-6 py-4 text-foreground">{user.email}</td>
                    <td className="px-6 py-4 text-muted-foreground">{user.display_name || "-"}</td>
                    <td className="px-6 py-4">
                      <Button variant="link" size="sm" asChild>
                        <Link to={`/users/${user.id}`}>edit</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </main>
    </div>
  );
}
