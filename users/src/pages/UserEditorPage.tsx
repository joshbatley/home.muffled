import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@home/auth";
import type { Permission, Role, UserSummary } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserEditorPageProps = {
  refreshUser: () => Promise<void>;
};

export default function UserEditorPage({ refreshUser }: UserEditorPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
        <Button variant="link" size="sm" asChild>
          <Link to="/users">back to users</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-xl font-normal text-foreground">edit user</h1>
          <Button variant="ghost" size="sm" onClick={() => navigate("/users")}>
            back
          </Button>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {status && <p className="text-sm text-u-green">{status}</p>}

        {user && !loading && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-display-name">display name</Label>
                    <Input
                      id="profile-display-name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="profile-avatar-url">avatar url</Label>
                    <Input
                      id="profile-avatar-url"
                      value={avatarUrl}
                      onChange={(event) => setAvatarUrl(event.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "saving..." : "save profile"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <section className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>roles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Assign/remove by role ID.</p>

                  <div className="flex gap-2">
                    <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name} ({role.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={assignRole}>
                      add
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="role id to remove"
                      value={removeRoleId}
                      onChange={(event) => setRemoveRoleId(event.target.value)}
                    />
                    <Button type="button" variant="destructive" onClick={removeRole}>
                      remove
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>direct permissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">Grant/revoke by permission ID.</p>

                  <div className="flex gap-2">
                    <Select value={selectedPermissionId} onValueChange={setSelectedPermissionId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="select permission" />
                      </SelectTrigger>
                      <SelectContent>
                        {permissions.map((permission) => (
                          <SelectItem key={permission.id} value={permission.id}>
                            {permission.key} ({permission.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={grantPermission}>
                      add
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="permission id to revoke"
                      value={revokePermissionId}
                      onChange={(event) => setRevokePermissionId(event.target.value)}
                    />
                    <Button type="button" variant="destructive" onClick={revokePermission}>
                      remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
