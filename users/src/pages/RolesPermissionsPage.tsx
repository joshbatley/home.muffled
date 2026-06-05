import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@home/auth";
import type { Permission, Role } from "../types";
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

type RolesPermissionsPageProps = {
  refreshUser: () => Promise<void>;
};

export default function RolesPermissionsPage({ refreshUser }: RolesPermissionsPageProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [roleName, setRoleName] = useState("");
  const [permissionKey, setPermissionKey] = useState("");
  const [permissionDescription, setPermissionDescription] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedPermissionId, setSelectedPermissionId] = useState("");

  async function loadData() {
    setLoading(true);
    setError(null);
    const [rolesRes, permsRes] = await Promise.all([
      supabase.from("roles").select("id, name").order("name"),
      supabase.from("permissions").select("id, key, description").order("key"),
    ]);

    if (rolesRes.error || permsRes.error) {
      setError(rolesRes.error?.message ?? permsRes.error?.message ?? "Failed to load RBAC data");
      setLoading(false);
      return;
    }

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
  }, []);

  async function createRole(event: FormEvent) {
    event.preventDefault();
    if (!roleName) return;
    setError(null);
    setStatus(null);
    const { error: insertError } = await supabase.from("roles").insert({ name: roleName });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setRoleName("");
    setStatus("Role created.");
    await loadData();
    await refreshUser();
  }

  async function deleteRole(id: string) {
    setError(null);
    setStatus(null);
    const { error: deleteError } = await supabase.from("roles").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setStatus("Role deleted.");
    await loadData();
    await refreshUser();
  }

  async function createPermission(event: FormEvent) {
    event.preventDefault();
    if (!permissionKey) return;
    setError(null);
    setStatus(null);
    const { error: insertError } = await supabase.from("permissions").insert({
      key: permissionKey,
      description: permissionDescription,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setPermissionKey("");
    setPermissionDescription("");
    setStatus("Permission created.");
    await loadData();
    await refreshUser();
  }

  async function deletePermission(id: string) {
    setError(null);
    setStatus(null);
    const { error: deleteError } = await supabase.from("permissions").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setStatus("Permission deleted.");
    await loadData();
    await refreshUser();
  }

  async function assignPermissionToRole() {
    if (!selectedRoleId || !selectedPermissionId) return;
    setError(null);
    setStatus(null);
    const { error: insertError } = await supabase.from("role_permissions").insert({
      role_id: selectedRoleId,
      permission_id: selectedPermissionId,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setStatus("Permission assigned to role.");
    await refreshUser();
  }

  async function removePermissionFromRole() {
    if (!selectedRoleId || !selectedPermissionId) return;
    setError(null);
    setStatus(null);
    const { error: deleteError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", selectedRoleId)
      .eq("permission_id", selectedPermissionId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setStatus("Permission removed from role.");
    await refreshUser();
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <h1 className="font-mono text-xl font-normal text-foreground">roles & permissions</h1>

        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {status && <p className="text-sm text-u-green">{status}</p>}

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>roles</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createRole} className="mb-4 flex gap-2">
                <Input
                  placeholder="role name"
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                />
                <Button type="submit">create</Button>
              </form>

              <div className="space-y-2">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span>{role.name}</span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void deleteRole(role.id)}
                    >
                      delete
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createPermission} className="mb-4 space-y-2">
                <Input
                  placeholder="permission key (e.g. users:admin)"
                  value={permissionKey}
                  onChange={(event) => setPermissionKey(event.target.value)}
                />
                <Input
                  placeholder="description"
                  value={permissionDescription}
                  onChange={(event) => setPermissionDescription(event.target.value)}
                />
                <Button type="submit">create</Button>
              </form>

              <div className="space-y-2">
                {permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span>{permission.key}</span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void deletePermission(permission.id)}
                    >
                      delete
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>role permission assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>role</Label>
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
              </div>

              <div className="space-y-2">
                <Label>permission</Label>
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
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={assignPermissionToRole}>
                assign permission
              </Button>
              <Button type="button" variant="destructive" onClick={removePermissionFromRole}>
                remove permission
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
